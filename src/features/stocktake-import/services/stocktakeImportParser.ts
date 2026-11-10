import JSZip from 'jszip';

export type ImportedStocktakeRow = {
  barcode: string;
  quantity: string;
  sourceRow: number;
};

export type ImportedStocktakeZone = {
  zoneCode: string;
  prefix: string;
  number: string;
  sheetName: string;
  rows: ImportedStocktakeRow[];
  content: string;
  fileName: string;
};

export type StocktakeImportResult = {
  sourceFileName: string;
  importedAt: string;
  zones: ImportedStocktakeZone[];
  warnings: string[];
};

type CellValue = { value: string; type: string; styleIndex: number };
type ParsedSheet = { name: string; path: string };

const RELATIONSHIP_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const BARCODE_HEADERS = ['BARCODE', 'BAR CODE', 'PRODUCT BARCODE', 'EAN', 'EAN13', 'EAN8', 'UPC', 'GTIN'];
const FALLBACK_BARCODE_HEADERS = ['MA VACH', 'MA VACH HANG'];
const QUANTITY_HEADERS = ['SO LUONG', 'QUANTITY', 'QTY', 'SL', 'SO LUONG KIEM KE'];

function parseXml(source: string, label: string): Document {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`Không đọc được cấu trúc XML trong ${label}.`);
  }
  return document;
}

function descendants(element: Element, name: string): Element[] {
  return Array.from(element.getElementsByTagName(name));
}

function normalizePath(path: string): string {
  const stack: string[] = [];
  for (const part of path.replace(/^\//, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function resolveWorksheetPath(target: string): string {
  return normalizePath(target.startsWith('/') ? target : `xl/${target}`);
}

function readText(element: Element): string {
  return descendants(element, 't').map((node) => node.textContent ?? '').join('');
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  let result = 0;
  for (const character of letters) result = result * 26 + character.charCodeAt(0) - 64;
  return result - 1;
}

function normalizeHeader(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
}

function decodeCell(cell: Element, sharedStrings: string[]): CellValue {
  const type = cell.getAttribute('t') ?? 'n';
  const styleIndex = Number(cell.getAttribute('s') ?? 0);
  const valueNode = descendants(cell, 'v')[0];
  const raw = valueNode?.textContent ?? '';

  if (type === 's') {
    const index = Number(raw);
    return { value: sharedStrings[index] ?? '', type, styleIndex };
  }
  if (type === 'inlineStr') return { value: readText(cell), type, styleIndex };
  if (type === 'b') return { value: raw === '1' ? 'TRUE' : 'FALSE', type, styleIndex };
  if (type === 'str' || type === 'e') return { value: raw, type, styleIndex };
  return { value: raw, type: 'n', styleIndex };
}

function readSharedStrings(zip: JSZip): Promise<string[]> {
  return zip.file('xl/sharedStrings.xml')?.async('string').then((xml) => {
    const document = parseXml(xml, 'sharedStrings.xml');
    return descendants(document.documentElement, 'si').map(readText);
  }) ?? Promise.resolve([]);
}

function readStyles(zip: JSZip): Promise<Set<number>> {
  return zip.file('xl/styles.xml')?.async('string').then((xml) => {
    const document = parseXml(xml, 'styles.xml');
    const customFormats = new Map<number, string>();
    descendants(document.documentElement, 'numFmt').forEach((format) => {
      customFormats.set(Number(format.getAttribute('numFmtId')), format.getAttribute('formatCode') ?? '');
    });
    const xfs = descendants(document.documentElement, 'cellXfs')[0];
    const percentageStyles = new Set<number>();
    if (!xfs) return percentageStyles;
    descendants(xfs, 'xf').forEach((xf, index) => {
      const formatId = Number(xf.getAttribute('numFmtId') ?? 0);
      const custom = customFormats.get(formatId) ?? '';
      if (formatId === 9 || formatId === 10 || custom.includes('%')) percentageStyles.add(index);
    });
    return percentageStyles;
  }) ?? Promise.resolve(new Set<number>());
}

function readWorkbookSheets(zip: JSZip): Promise<ParsedSheet[]> {
  return Promise.all([
    zip.file('xl/workbook.xml')?.async('string'),
    zip.file('xl/_rels/workbook.xml.rels')?.async('string'),
  ]).then(([workbookXml, relationshipsXml]) => {
    if (!workbookXml || !relationshipsXml) throw new Error('File không có cấu trúc workbook Excel hợp lệ.');
    const workbook = parseXml(workbookXml, 'workbook.xml');
    const relationships = parseXml(relationshipsXml, 'workbook.xml.rels');
    const targets = new Map<string, string>();
    descendants(relationships.documentElement, 'Relationship').forEach((relationship) => {
      const id = relationship.getAttribute('Id');
      const target = relationship.getAttribute('Target');
      if (id && target) targets.set(id, resolveWorksheetPath(target));
    });
    return descendants(workbook.documentElement, 'sheet').map((sheet) => {
      const name = sheet.getAttribute('name')?.trim() ?? '';
      const relationId = sheet.getAttributeNS(RELATIONSHIP_NS, 'id') ?? sheet.getAttribute('r:id') ?? '';
      const path = targets.get(relationId);
      if (!name || !path) throw new Error('Workbook có sheet không xác định được đường dẫn dữ liệu.');
      return { name, path };
    });
  });
}

function readRows(xml: string, sharedStrings: string[]): Map<number, Map<number, CellValue>> {
  const document = parseXml(xml, 'worksheet');
  const rows = new Map<number, Map<number, CellValue>>();
  descendants(document.documentElement, 'row').forEach((row, rowIndex) => {
    const rowNumber = Number(row.getAttribute('r') ?? rowIndex + 1);
    const cells = new Map<number, CellValue>();
    descendants(row, 'c').forEach((cell) => {
      const reference = cell.getAttribute('r') ?? '';
      const index = columnIndex(reference);
      if (index >= 0) cells.set(index, decodeCell(cell, sharedStrings));
    });
    rows.set(rowNumber, cells);
  });
  return rows;
}

function findHeader(rows: Map<number, Map<number, CellValue>>): {
  rowNumber: number; barcodeColumn: number; quantityColumn: number; barcodeHeader: string;
} {
  const candidates = [...rows.entries()].filter(([rowNumber]) => rowNumber <= 40);
  for (const [rowNumber, cells] of candidates) {
    const headers = new Map([...cells.entries()].map(([column, cell]) => [column, normalizeHeader(cell.value)]));
    const barcode = [...headers.entries()].find(([, value]) => BARCODE_HEADERS.includes(value));
    const quantity = [...headers.entries()].find(([, value]) => QUANTITY_HEADERS.includes(value));
    if (barcode && quantity) {
      return { rowNumber, barcodeColumn: barcode[0], quantityColumn: quantity[0], barcodeHeader: barcode[1] };
    }
  }
  for (const [rowNumber, cells] of candidates) {
    const headers = new Map([...cells.entries()].map(([column, cell]) => [column, normalizeHeader(cell.value)]));
    const barcode = [...headers.entries()].find(([, value]) => FALLBACK_BARCODE_HEADERS.includes(value));
    const quantity = [...headers.entries()].find(([, value]) => QUANTITY_HEADERS.includes(value));
    if (barcode && quantity) {
      return { rowNumber, barcodeColumn: barcode[0], quantityColumn: quantity[0], barcodeHeader: barcode[1] };
    }
  }
  throw new Error('Không nhận diện được cột BARCODE và SỐ LƯỢNG. Không có dữ liệu nào được xuất.');
}

function shiftDecimal(value: string, places: number): string {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error('Giá trị phần trăm không hợp lệ.');
  const sign = match[1];
  const digits = match[2] + (match[3] ?? '');
  const decimalPosition = match[2].length + Number(match[4] ?? 0) + places;
  const padded = digits.padEnd(Math.max(digits.length, decimalPosition), '0');
  const normalized = decimalPosition <= 0
    ? '0.' + '0'.repeat(-decimalPosition) + padded
    : decimalPosition >= padded.length
      ? padded + '0'.repeat(decimalPosition - padded.length)
      : padded.slice(0, decimalPosition) + '.' + padded.slice(decimalPosition);
  const parts = normalized.split('.');
  const integer = parts[0].replace(/^0+(?=\d)/, '');
  const fraction = (parts[1] ?? '').replace(/0+$/, '');
  return sign + integer + (fraction ? '.' + fraction : '');
}

function parseQuantity(value: string, type: string, percentageStyle: boolean): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Thiếu số lượng.');
  if (type === 'n') {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      throw new Error('Số lượng không hợp lệ: ' + trimmed);
    }
    // Excel stores percentage-formatted values as fractions; restore the displayed percent.
    if (percentageStyle) return shiftDecimal(trimmed, 2) + '%';
    // Keep the raw OOXML numeric token to avoid Number precision loss.
    return trimmed;
  }
  const normalized = trimmed.replace(/\s/g, '');
  const decimalComma = /^[+-]?\d+,\d+(?:[eE][+-]?\d+)?%?$/.test(normalized);
  if (decimalComma) return normalized.replace(',', '.');
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?%?$/.test(normalized)) return normalized;
  throw new Error('Số lượng không hợp lệ hoặc có dấu phân cách mơ hồ: ' + trimmed);
}
function resolveZoneCode(sheetName: string, rows: Map<number, Map<number, CellValue>>, headerRow: number): string {
  const normalizedSheet = sheetName.trim().toUpperCase();
  if (!/^SHEET\s*\d*$/i.test(normalizedSheet) && /^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(normalizedSheet)) {
    return normalizedSheet;
  }
  for (const [rowNumber, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNumber >= headerRow || rowNumber > 12) continue;
    for (const [column, cell] of [...cells.entries()].sort((a, b) => a[0] - b[0])) {
      const value = cell.value.trim().toUpperCase();
      if (!value || (rowNumber === 1 && column > 2)) continue;
      if (/^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(value)) return value;
    }
  }
  throw new Error(`Không xác định được mã vùng cho sheet "${sheetName}".`);
}

function splitZoneCode(zoneCode: string): { prefix: string; number: string } {
  const match = zoneCode.match(/^([A-Z]*)(\d+)$/);
  if (!match) throw new Error(`Mã vùng "${zoneCode}" không đúng định dạng chữ + số.`);
  return { prefix: match[1], number: match[2] };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function buildOutput(employeeCode: string, zoneCode: string, rows: ImportedStocktakeRow[], now: Date): string {
  const { prefix, number } = splitZoneCode(zoneCode);
  const date = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return [
    `NHAN VIEN,${employeeCode},${date},${time}`,
    `ADRESSE,${prefix},${number}`,
    ...rows.map((row) => `ARTICLE,${row.barcode},${row.quantity}`),
  ].join('\r\n') + '\r\n';
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Z0-9_-]/gi, '_').slice(0, 48) || 'ZONE';
}

export async function parseStocktakeWorkbook(
  file: File,
  employeeCode: string,
  importedAt = new Date(),
): Promise<StocktakeImportResult> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Hiện chỉ hỗ trợ workbook .xlsx. File .xls cũ chưa được hỗ trợ.');
  const zip = await JSZip.loadAsync(file);
  const [sharedStrings, percentageStyles, sheets] = await Promise.all([
    readSharedStrings(zip), readStyles(zip), readWorkbookSheets(zip),
  ]);
  if (sheets.length === 0) throw new Error('Workbook không có sheet dữ liệu.');

  const zones: ImportedStocktakeZone[] = [];
  const warnings: string[] = [];
  const seenZones = new Set<string>();

  for (const sheet of sheets) {
    const worksheet = zip.file(sheet.path);
    if (!worksheet) {
      warnings.push(`Sheet "${sheet.name}" không có dữ liệu worksheet và đã bị bỏ qua.`);
      continue;
    }
    const xml = await worksheet.async('string');
    const rows = readRows(xml, sharedStrings);
    let header: ReturnType<typeof findHeader>;
    try {
      header = findHeader(rows);
    } catch {
      warnings.push(`Sheet "${sheet.name}" không có cặp cột BARCODE và SỐ LƯỢNG; đã bỏ qua.`);
      continue;
    }
    const zoneCode = resolveZoneCode(sheet.name, rows, header.rowNumber);
    if (seenZones.has(zoneCode)) throw new Error(`Có nhiều sheet cùng mã vùng "${zoneCode}". Không thể xuất tách biệt an toàn.`);
    seenZones.add(zoneCode);

    const dataRows: ImportedStocktakeRow[] = [];
    const errors: string[] = [];
    for (const [rowNumber, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      if (rowNumber <= header.rowNumber) continue;
      const barcodeCell = cells.get(header.barcodeColumn);
      const quantityCell = cells.get(header.quantityColumn);
      const barcode = barcodeCell?.value.trim() ?? '';
      const quantityValue = quantityCell?.value.trim() ?? '';
      if (!barcode && !quantityValue) continue;
      if (!barcode) {
        errors.push(`Dòng ${rowNumber}: có số lượng nhưng thiếu barcode.`);
        continue;
      }
      if (/[\r\n,]/.test(barcode)) {
        errors.push(`Dòng ${rowNumber}: barcode chứa dấu phẩy hoặc ký tự xuống dòng.`);
        continue;
      }
      if (!quantityCell || !quantityValue) {
        errors.push(`Dòng ${rowNumber}: barcode ${barcode} chưa có số lượng.`);
        continue;
      }
      try {
        const quantity = parseQuantity(quantityValue, quantityCell.type, percentageStyles.has(quantityCell.styleIndex));
        dataRows.push({ barcode, quantity, sourceRow: rowNumber });
      } catch (error) {
        errors.push(`Dòng ${rowNumber}: ${error instanceof Error ? error.message : 'Số lượng không hợp lệ.'}`);
      }
    }
    if (header.barcodeHeader === 'MA VACH' && dataRows.length > 1 && new Set(dataRows.map((row) => row.barcode)).size === 1) {
      errors.push('Cột MÃ VẠCH có cùng một giá trị ở tất cả dòng; có thể đây là mã vùng thay vì barcode sản phẩm. Hãy dùng cột BARCODE.');
    }
    if (errors.length > 0) {
      throw new Error(`Sheet "${sheet.name}" có ${errors.length} lỗi dữ liệu:\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\n…' : ''}`);
    }
    if (dataRows.length === 0) {
      warnings.push(`Sheet "${sheet.name}" không có dòng dữ liệu hợp lệ.`);
      continue;
    }
    const { prefix, number } = splitZoneCode(zoneCode);
    zones.push({
      zoneCode, prefix, number, sheetName: sheet.name, rows: dataRows,
      content: buildOutput(employeeCode, zoneCode, dataRows, importedAt),
      fileName: `${safeFilePart(zoneCode)}_${importedAt.getFullYear()}${pad(importedAt.getMonth() + 1)}${pad(importedAt.getDate())}.txt`,
    });
  }

  if (zones.length === 0) throw new Error('Không tìm thấy sheet nào có dữ liệu kiểm kê hợp lệ.');
  return { sourceFileName: file.name, importedAt: importedAt.toISOString(), zones, warnings };
}
