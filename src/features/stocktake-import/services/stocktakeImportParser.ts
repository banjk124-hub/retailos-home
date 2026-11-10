import JSZip from 'jszip';

export type ImportedStocktakeRow = {
  barcode: string;
  quantity: string;
  sourceRow: number;
  sourceSheet?: string;
  barcodeSource: 'BARCODE' | 'GOLDCODE' | 'MÃ VẠCH' | 'manual';
  issues: string[];
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
  blockingIssues: string[];
};

type CellValue = { value: string; type: string; styleIndex: number };
type ParsedSheet = { name: string; path: string };
type StyleMetadata = {
  percentageStyles: Set<number>;
  zeroPaddingWidths: Map<number, number>;
  numberFormats: Map<number, string>;
};
type HeaderMapping = {
  rowNumber: number;
  quantityColumn: number;
  barcodeColumn?: number;
  goldCodeColumn?: number;
  fallbackBarcodeColumn?: number;
  barcodeHeader: string;
  zoneColumn?: number;
};
type HeaderScan = { mappings: HeaderMapping[]; unsupportedRows: Array<{ rowNumber: number; headers: string[] }> };

const RELATIONSHIP_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const BARCODE_HEADERS = ['BARCODE', 'BAR CODE', 'PRODUCT BARCODE', 'EAN', 'EAN13', 'EAN8', 'UPC', 'GTIN', 'MÃ BARCODE'];
const GOLD_CODE_HEADERS = ['GOLDCODE', 'GOLD CODE', 'GOLD_CODE', 'GOLD PRODUCT CODE'];
const FALLBACK_BARCODE_HEADERS = ['MA VACH', 'MA VACH HANG'];
const QUANTITY_HEADERS = [
  'SO LUONG', 'QUANTITY', 'QTY', 'SL', 'SO LUONG KIEM KE', 'SO LUONG THUC TE',
  'KET QUA THUC TE', 'KET QUA KIEM KE', 'THUC TE', 'ACTUAL QTY', 'ACTUAL QUANTITY',
  'COUNTED QTY', 'COUNTED QUANTITY', 'COUNT', 'RESULT', 'WEIGHT', 'MASS', 'KHOI LUONG',
];
const ZONE_HEADERS = ['VUNG', 'ZONE', 'MA VUNG', 'ZONE CODE', 'KHU VUC'];

function parseXml(source: string, label: string): Document {
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Không đọc được cấu trúc XML trong ' + label + '.');
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
  return normalizePath(target.startsWith('/') ? target : 'xl/' + target);
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
    .replace(/[._-]+/g, ' ').replace(/[()[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeCell(cell: Element, sharedStrings: string[]): CellValue {
  const type = cell.getAttribute('t') ?? 'n';
  const styleIndex = Number(cell.getAttribute('s') ?? 0);
  const valueNode = descendants(cell, 'v')[0];
  const raw = valueNode?.textContent ?? '';
  if (type === 's') return { value: sharedStrings[Number(raw)] ?? '', type, styleIndex };
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

function readStyles(zip: JSZip): Promise<StyleMetadata> {
  const builtInFormats = new Map<number, string>([
    [0, 'General'], [1, '0'], [2, '0.00'], [3, '#,##0'], [4, '#,##0.00'],
    [9, '0%'], [10, '0.00%'], [11, '0.00E+00'], [49, '@'],
  ]);
  return zip.file('xl/styles.xml')?.async('string').then((xml) => {
    const document = parseXml(xml, 'styles.xml');
    const customFormats = new Map<number, string>();
    descendants(document.documentElement, 'numFmt').forEach((format) => {
      customFormats.set(Number(format.getAttribute('numFmtId')), format.getAttribute('formatCode') ?? '');
    });
    const xfs = descendants(document.documentElement, 'cellXfs')[0];
    const percentageStyles = new Set<number>();
    const zeroPaddingWidths = new Map<number, number>();
    const numberFormats = new Map<number, string>();
    if (!xfs) return { percentageStyles, zeroPaddingWidths, numberFormats };
    descendants(xfs, 'xf').forEach((xf, index) => {
      const formatId = Number(xf.getAttribute('numFmtId') ?? 0);
      const formatCode = customFormats.get(formatId) ?? builtInFormats.get(formatId) ?? 'General';
      numberFormats.set(index, formatCode);
      if (formatId === 9 || formatId === 10 || formatCode.includes('%')) percentageStyles.add(index);
      const positiveFormat = formatCode.split(';')[0].replace(/"[^"]*"/g, '').trim();
      if (/^0{6,}$/.test(positiveFormat)) zeroPaddingWidths.set(index, positiveFormat.length);
    });
    return { percentageStyles, zeroPaddingWidths, numberFormats };
  }) ?? Promise.resolve({
    percentageStyles: new Set<number>(), zeroPaddingWidths: new Map<number, number>(), numberFormats: new Map<number, string>(),
  });
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

function matchesHeader(value: string, aliases: string[]): boolean {
  return aliases.some((alias) => value === alias || value.startsWith(alias + ' '));
}

function findHeaders(rows: Map<number, Map<number, CellValue>>): HeaderScan {
  const candidates = [...rows.entries()].sort((a, b) => a[0] - b[0]);
  const mappings: HeaderMapping[] = [];
  const unsupportedRows: HeaderScan['unsupportedRows'] = [];
  const diagnosticRows: string[] = [];
  for (const [rowNumber, cells] of candidates) {
    const headers = new Map([...cells.entries()].map(([column, cell]) => [column, normalizeHeader(cell.value)]));
    const quantity = [...headers.entries()].find(([, value]) => matchesHeader(value, QUANTITY_HEADERS));
    const barcode = [...headers.entries()].find(([, value]) => matchesHeader(value, BARCODE_HEADERS));
    const goldCode = [...headers.entries()].find(([, value]) => matchesHeader(value, GOLD_CODE_HEADERS));
    const fallback = [...headers.entries()].find(([, value]) => matchesHeader(value, FALLBACK_BARCODE_HEADERS));
    const zone = [...headers.entries()].find(([, value]) => matchesHeader(value, ZONE_HEADERS));
    const looksLikeHeader = Boolean(quantity || barcode || goldCode || fallback);
    if (!looksLikeHeader) {
      if (diagnosticRows.length < 3 && [...headers.values()].filter(Boolean).length >= 2) {
        diagnosticRows.push('Dòng ' + rowNumber + ': ' + [...headers.values()].filter(Boolean).join(' | '));
      }
      continue;
    }
    if (quantity && (barcode || goldCode || fallback)) {
      const chosen = barcode ?? goldCode ?? fallback!;
      mappings.push({
        rowNumber,
        quantityColumn: quantity[0],
        ...(barcode ? { barcodeColumn: barcode[0] } : {}),
        ...(goldCode ? { goldCodeColumn: goldCode[0] } : {}),
        ...(fallback ? { fallbackBarcodeColumn: fallback[0] } : {}),
        barcodeHeader: chosen[1],
        ...(zone ? { zoneColumn: zone[0] } : {}),
      });
      continue;
    }
    unsupportedRows.push({ rowNumber, headers: [...headers.values()].filter(Boolean) });
  }
  if (mappings.length === 0) {
    const details = unsupportedRows.length
      ? ' Header chưa đủ cột tại: ' + unsupportedRows.map((item) => 'dòng ' + item.rowNumber + ' (' + item.headers.join(' | ') + ')').join('; ') + '.'
      : diagnosticRows.length ? ' Các dòng gần nhất: ' + diagnosticRows.join(' / ') + '.' : '';
    throw new Error(
      'Không nhận diện được cặp cột mã hàng (BARCODE/GOLDCODE) và kết quả thực tế (SỐ LƯỢNG/QUANTITY/KHỐI LƯỢNG...).' +
      details + ' Hãy kiểm tra hoặc đổi tên header tương ứng rồi nạp lại. Mỗi bảng trong workbook có thể dùng thứ tự cột và cấu trúc riêng.',
    );
  }
  return { mappings, unsupportedRows };
}
function expandDecimal(value: string): { sign: string; integer: string; fraction: string } {
  const match = value.trim().match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error('Giá trị số không hợp lệ: ' + value);
  const sign = match[1] === '-' ? '-' : '';
  const digits = match[2] + (match[3] ?? '');
  const point = match[2].length + Number(match[4] ?? 0);
  if (point <= 0) return { sign, integer: '0', fraction: '0'.repeat(-point) + digits };
  if (point >= digits.length) return { sign, integer: digits + '0'.repeat(point - digits.length), fraction: '' };
  return { sign, integer: digits.slice(0, point), fraction: digits.slice(point) };
}

function incrementDigits(value: string): string {
  const digits = value.split('');
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    if (digits[index] !== '9') {
      digits[index] = String(Number(digits[index]) + 1);
      return digits.join('');
    }
    digits[index] = '0';
  }
  return '1' + digits.join('');
}

function roundDecimal(value: string, scale: number, minScale = 0): string {
  const expanded = expandDecimal(value);
  const precision = Math.max(0, Math.min(100, scale));
  let integer = expanded.integer.replace(/^0+(?=\d)/, '') || '0';
  let fraction = expanded.fraction;
  const kept = fraction.padEnd(precision + 1, '0').slice(0, precision);
  const nextDigit = fraction[precision] ?? '0';
  let combined = integer + kept;
  if (nextDigit >= '5') combined = incrementDigits(combined);
  if (precision > 0) {
    combined = combined.padStart(precision + 1, '0');
    integer = combined.slice(0, -precision).replace(/^0+(?=\d)/, '') || '0';
    fraction = combined.slice(-precision);
  } else {
    integer = combined.replace(/^0+(?=\d)/, '') || '0';
    fraction = '';
  }
  const minimum = Math.max(0, Math.min(precision, minScale));
  while (fraction.length > minimum && fraction.endsWith('0')) fraction = fraction.slice(0, -1);
  return (expanded.sign && (integer !== '0' || fraction !== '') ? expanded.sign : '') + integer + (fraction ? '.' + fraction : '');
}

function generalPrecision(value: string): number {
  const expanded = expandDecimal(value);
  const integer = expanded.integer.replace(/^0+/, '');
  if (integer) return Math.max(0, Math.min(100, 14 - (integer.length - 1)));
  const firstNonZero = expanded.fraction.search(/[1-9]/);
  if (firstNonZero < 0) return 0;
  return Math.max(0, Math.min(100, 14 + firstNonZero + 1));
}

function numberFormatPrecision(formatCode: string): { max: number; min: number } | null {
  const section = (formatCode.split(';')[0] ?? 'General')
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/_.|\*./g, '');
  if (/^General$/i.test(section.trim())) return null;
  const match = section.match(/[0#?][0#?,]*(?:\.([0#?]+))?/);
  if (!match) return null;
  const decimalPattern = match[1] ?? '';
  return { max: decimalPattern.length, min: (decimalPattern.match(/0/g) ?? []).length };
}

function formatExcelNumber(value: string, formatCode: string): string {
  const percent = formatCode.includes('%');
  const source = percent ? shiftDecimal(value, 2) : value;
  const precision = numberFormatPrecision(formatCode);
  const scale = precision?.max ?? generalPrecision(source);
  const min = precision?.min ?? 0;
  return roundDecimal(source, scale, min) + (percent ? '%' : '');
}

function shiftDecimal(value: string, places: number): string {
  const expanded = expandDecimal(value);
  const digits = expanded.integer + expanded.fraction;
  const point = expanded.integer.length + places;
  if (point <= 0) return expanded.sign + '0.' + '0'.repeat(-point) + digits;
  if (point >= digits.length) return expanded.sign + digits + '0'.repeat(point - digits.length);
  return expanded.sign + digits.slice(0, point) + '.' + digits.slice(point);
}

function parseTextQuantity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Thiếu kết quả thực tế.');
  const normalized = trimmed.replace(/\s/g, '');
  if (/^[+-]?\d+,\d+(?:[eE][+-]?\d+)?%?$/.test(normalized)) return normalized.replace(',', '.');
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?%?$/.test(normalized)) return normalized;
  throw new Error('Giá trị không hợp lệ hoặc có dấu phân cách mơ hồ: ' + trimmed);
}

function parseQuantityCell(cell: CellValue, styles: StyleMetadata): string {
  if (!cell.value.trim()) throw new Error('Thiếu kết quả thực tế.');
  if (cell.type !== 'n') return parseTextQuantity(cell.value);
  const formatCode = styles.numberFormats.get(cell.styleIndex) ?? 'General';
  return formatExcelNumber(cell.value, formatCode);
}

function formatBarcode(cell: CellValue, zeroPaddingWidths: Map<number, number>): string {
  const value = cell.value.trim();
  const width = zeroPaddingWidths.get(cell.styleIndex);
  if (cell.type === 'n' && width && /^\d+(?:\.0+)?$/.test(value)) {
    return value.split('.')[0].padStart(width, '0');
  }
  return value;
}

function resolveBarcode(
  barcodeCell: CellValue | undefined,
  goldCodeCell: CellValue | undefined,
  fallbackCell: CellValue | undefined,
  zeroPaddingWidths: Map<number, number>,
): { barcode: string; source: ImportedStocktakeRow['barcodeSource'] } {
  const barcode = barcodeCell ? formatBarcode(barcodeCell, zeroPaddingWidths) : '';
  if (barcode) return { barcode, source: 'BARCODE' };
  const goldCode = goldCodeCell ? formatBarcode(goldCodeCell, zeroPaddingWidths) : '';
  if (goldCode) return { barcode: goldCode, source: 'GOLDCODE' };
  const fallback = fallbackCell ? formatBarcode(fallbackCell, zeroPaddingWidths) : '';
  if (fallback) return { barcode: fallback, source: 'MÃ VẠCH' };
  return { barcode: '', source: 'manual' };
}

function resolveZoneCode(
  sheetName: string,
  rows: Map<number, Map<number, CellValue>>,
  headerRow: number,
  zoneColumn?: number,
): string {
  const normalizedSheet = sheetName.trim().toUpperCase();
  if (zoneColumn !== undefined) {
    const zoneValues = new Set([...rows.entries()]
      .filter(([rowNumber]) => rowNumber > headerRow)
      .map(([, cells]) => cells.get(zoneColumn)?.value.trim().toUpperCase() ?? '')
      .filter((value) => /^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(value)));
    if (zoneValues.size > 1) throw new Error('Một sheet có nhiều mã vùng trong cột VÙNG. Hãy tách mỗi vùng thành một sheet riêng.');
    if (zoneValues.size === 1) {
      const columnZone = [...zoneValues][0];
      if (!/^SHEET\s*\d*$/i.test(normalizedSheet) && /^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(normalizedSheet) && normalizedSheet !== columnZone) {
        throw new Error('Tên sheet ' + sheetName + ' không khớp với mã vùng ' + columnZone + ' trong cột VÙNG.');
      }
      return columnZone;
    }
  }
  if (!/^SHEET\s*\d*$/i.test(normalizedSheet) && /^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(normalizedSheet)) return normalizedSheet;
  for (const [rowNumber, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
    if (rowNumber >= headerRow || rowNumber > 12) continue;
    for (const [, cell] of [...cells.entries()].sort((a, b) => a[0] - b[0])) {
      const value = cell.value.trim().toUpperCase();
      if (/^(?:[A-Z]{1,8}\d{1,6}|\d{1,8})$/.test(value)) return value;
    }
  }
  throw new Error('Không xác định được mã vùng cho sheet ' + sheetName + '. Hãy đặt tên sheet theo mã vùng hoặc bổ sung cột VÙNG.');
}

export function buildStocktakeOutput(
  employeeCode: string,
  zoneCode: string,
  rows: ImportedStocktakeRow[],
  importedAt: Date,
): string {
  const match = zoneCode.match(/^([A-Z]*)(\d+)$/);
  if (!match) throw new Error('Mã vùng "' + zoneCode + '" không đúng định dạng chữ + số.');
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = importedAt.getFullYear() + '/' + pad(importedAt.getMonth() + 1) + '/' + pad(importedAt.getDate());
  const time = pad(importedAt.getHours()) + ':' + pad(importedAt.getMinutes()) + ':' + pad(importedAt.getSeconds());
  return [
    'NHAN VIEN,' + employeeCode + ',' + date + ',' + time,
    'ADRESSE,' + match[1] + ',' + match[2],
    ...rows.map((row) => 'ARTICLE,' + row.barcode + ',' + row.quantity),
  ].join('\r\n') + '\r\n';
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Z0-9_-]/gi, '_').slice(0, 48) || 'ZONE';
}

export function buildZoneFileName(zoneCode: string): string {
  return safeFilePart(zoneCode) + '.txt';
}

function rowIssues(barcode: string, quantity: string): string[] {
  const issues: string[] = [];
  const code = barcode.trim();
  const amount = quantity.trim();
  if (!code) issues.push('Thiếu BARCODE/GOLDCODE.');
  else if (/[\r\n,]/.test(code)) issues.push('Mã hàng chứa dấu phẩy hoặc ký tự xuống dòng.');
  if (!amount) issues.push('Thiếu kết quả thực tế.');
  else if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?%?$/.test(amount)) {
    issues.push('Kết quả thực tế không phải số hợp lệ.');
  }
  return issues;
}

export async function parseStocktakeWorkbook(
  file: File,
  employeeCode: string,
  importedAt = new Date(),
): Promise<StocktakeImportResult> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Hiện chỉ hỗ trợ workbook .xlsx. File .xls cũ chưa được hỗ trợ.');
  const zip = await JSZip.loadAsync(file);
  const [sharedStrings, styleMetadata, sheets] = await Promise.all([
    readSharedStrings(zip), readStyles(zip), readWorkbookSheets(zip),
  ]);
  if (sheets.length === 0) throw new Error('Workbook không có sheet dữ liệu.');

  const zones: ImportedStocktakeZone[] = [];
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const seenZones = new Set<string>();

  for (const sheet of sheets) {
    const worksheet = zip.file(sheet.path);
    if (!worksheet) {
      warnings.push('Sheet "' + sheet.name + '" không có worksheet data; đã bỏ qua.');
      continue;
    }
    const rows = readRows(await worksheet.async('string'), sharedStrings);
    let header: HeaderMapping;
    try {
      header = findHeader(rows);
    } catch (cause) {
      blockingIssues.push('Không hỗ trợ sheet "' + sheet.name + '": ' + (cause instanceof Error ? cause.message : 'Không nhận diện được cấu trúc.'));
      continue;
    }
    let zoneCode: string;
    try {
      zoneCode = resolveZoneCode(sheet.name, rows, header.rowNumber, header.zoneColumn);
    } catch (cause) {
      blockingIssues.push('Sheet "' + sheet.name + '": ' + (cause instanceof Error ? cause.message : 'Không xác định được vùng.'));
      continue;
    }
    if (seenZones.has(zoneCode)) throw new Error('Có nhiều sheet cùng mã vùng "' + zoneCode + '". Không thể xuất tách biệt an toàn.');
    seenZones.add(zoneCode);

    const dataRows: ImportedStocktakeRow[] = [];
    let fallbackRepeatedValue = '';
    let fallbackIsRepeated = true;
    for (const [rowNumber, cells] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      if (rowNumber <= header.rowNumber) continue;
      const barcodeCell = header.barcodeColumn !== undefined ? cells.get(header.barcodeColumn) : undefined;
      const goldCodeCell = header.goldCodeColumn !== undefined ? cells.get(header.goldCodeColumn) : undefined;
      const fallbackCell = header.fallbackBarcodeColumn !== undefined ? cells.get(header.fallbackBarcodeColumn) : undefined;
      const resolvedBarcode = resolveBarcode(barcodeCell, goldCodeCell, fallbackCell, styleMetadata.zeroPaddingWidths);
      const barcode = resolvedBarcode.barcode;
      const barcodeSource = resolvedBarcode.source;
      const fallbackBarcode = fallbackCell ? formatBarcode(fallbackCell, styleMetadata.zeroPaddingWidths) : '';
      const explicitBarcode = barcodeCell ? formatBarcode(barcodeCell, styleMetadata.zeroPaddingWidths) : '';
      const goldCode = goldCodeCell ? formatBarcode(goldCodeCell, styleMetadata.zeroPaddingWidths) : '';
      const actualQuantityCell = cells.get(header.quantityColumn);
      const quantityRaw = actualQuantityCell?.value.trim() ?? '';
      if (!barcode && !quantityRaw) continue;
      let quantity = quantityRaw;
      let quantityParseIssue = '';
      if (actualQuantityCell && quantityRaw) {
        try {
          quantity = parseQuantityCell(actualQuantityCell, styleMetadata);
        } catch (cause) {
          quantityParseIssue = cause instanceof Error ? cause.message : 'Không thể đọc định dạng số Excel.';
        }
      }
      const issues = rowIssues(barcode, quantity);
      if (quantityParseIssue) issues.push('Không thể diễn giải kết quả thực tế: ' + quantityParseIssue);
      if (fallbackBarcode && !explicitBarcode && !goldCode) {
        if (!fallbackRepeatedValue) fallbackRepeatedValue = fallbackBarcode;
        else if (fallbackBarcode !== fallbackRepeatedValue) fallbackIsRepeated = false;
      }
      dataRows.push({ barcode, quantity, sourceRow: rowNumber, barcodeSource, issues });
    }
    if (header.fallbackBarcodeColumn !== undefined && header.barcodeColumn === undefined &&
      header.goldCodeColumn === undefined && fallbackIsRepeated && fallbackRepeatedValue && dataRows.length > 1) {
      dataRows.forEach((row) => {
        if (row.barcodeSource === 'MÃ VẠCH') row.issues.push('Cột MÃ VẠCH lặp lại cùng một giá trị; có thể đây là mã vùng, không phải mã hàng. Hãy bổ sung BARCODE hoặc GOLDCODE.');
      });
    }
    if (dataRows.length === 0) {
      warnings.push('Sheet "' + sheet.name + '" đã nhận diện header nhưng không có dòng dữ liệu.');
      continue;
    }
    const match = zoneCode.match(/^([A-Z]*)(\d+)$/);
    if (!match) {
      warnings.push('Mã vùng "' + zoneCode + '" không thể tách thành tiền tố và số.');
      continue;
    }
    zones.push({
      zoneCode, prefix: match[1], number: match[2], sheetName: sheet.name, rows: dataRows,
      content: buildStocktakeOutput(employeeCode, zoneCode, dataRows, importedAt),
      fileName: buildZoneFileName(zoneCode),
    });
  }

  if (zones.length === 0) {
    const diagnostics = [...blockingIssues, ...warnings];
    throw new Error(diagnostics.length ? diagnostics.join('\n\n') : 'Không tìm thấy sheet nào có dữ liệu kiểm kê hợp lệ.');
  }
  return { sourceFileName: file.name, importedAt: importedAt.toISOString(), zones, warnings, blockingIssues };
}
