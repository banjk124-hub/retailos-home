export type ExportTable = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('Không thể chuyển một giá trị snapshot thành văn bản:', error);
    return String(value);
  }
}

export function snapshotToExportTable(data: unknown): ExportTable {
  let sourceRows: unknown[];
  if (Array.isArray(data)) {
    sourceRows = data;
  } else if (isRecord(data) && Array.isArray(data.rows)) {
    sourceRows = data.rows;
  } else if (isRecord(data)) {
    sourceRows = [data];
  } else {
    sourceRows = [{ value: data }];
  }

  const rows = sourceRows.map((row, index) => isRecord(row)
    ? row
    : { value: row, rowNumber: index + 1 });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { columns, rows };
}

export function formatExportValue(value: unknown): string {
  return displayValue(value);
}

export function createCsvContent(table: ExportTable): string {
  const escapeCell = (value: unknown) => {
    const text = displayValue(value);
    const safeText = typeof value === 'number' || typeof value === 'boolean' || !/^[\s]*[=+\-@]/.test(text)
      ? text
      : `'${text}`;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  return [
    table.columns.map(escapeCell).join(','),
    ...table.rows.map((row) => table.columns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\r\n');
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnReference(index: number): string {
  let value = index + 1;
  let reference = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    reference = String.fromCharCode(65 + remainder) + reference;
    value = Math.floor((value - 1) / 26);
  }
  return reference;
}

function xlsxCell(value: unknown, reference: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(displayValue(value))}</t></is></c>`;
}

export async function downloadXlsx(table: ExportTable, fileName: string): Promise<void> {
  if (table.columns.length === 0) throw new Error('Snapshot không có cột dữ liệu để xuất.');
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const worksheetRows = [table.columns, ...table.rows.map((row) => table.columns.map((column) => row[column]))];
  const sheetXml = worksheetRows.map((row, rowIndex) =>
    `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => xlsxCell(value, `${columnReference(columnIndex)}${rowIndex + 1}`)).join('')}</row>`,
  ).join('');

  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '</Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Snapshot" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '</Relationships>');
  zip.file('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    sheetXml + '</sheetData></worksheet>');

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export function downloadBlob(blob: Blob, fileName: string, type = 'application/octet-stream'): void {
  const url = URL.createObjectURL(new Blob([blob], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createTextReport(title: string, snapshotDate: string, table: ExportTable): string {
  const lines = [
    title,
    `Ngày snapshot: ${snapshotDate}`,
    `Số dòng: ${table.rows.length}`,
    '',
  ];
  table.rows.forEach((row, index) => {
    lines.push(`--- Bản ghi ${index + 1} ---`);
    table.columns.forEach((column) => lines.push(`${column}: ${displayValue(row[column]) || '(trống)'}`));
    lines.push('');
  });
  return lines.join('\r\n');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function openPdfPrintView(title: string, snapshotDate: string, table: ExportTable): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Trình duyệt đã chặn cửa sổ PDF. Hãy cho phép popup rồi thử lại.');
  const header = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const body = table.rows.map((row) => `<tr>${table.columns.map((column) =>
    `<td>${escapeHtml(displayValue(row[column]))}</td>`,
  ).join('')}</tr>`).join('');
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:12px/1.45 Arial,sans-serif;color:#252a35}
      h1{font-size:20px;margin:0 0 5px}p{color:#667085;margin:0 0 16px}
      table{width:100%;border-collapse:collapse;table-layout:auto}th,td{padding:6px 8px;border:1px solid #d7dce4;text-align:left;vertical-align:top;overflow-wrap:anywhere}
      th{background:#f3e7e9;color:#7e1f2c}tr{break-inside:avoid}thead{display:table-header-group}
    </style></head><body><h1>${escapeHtml(title)}</h1><p>Snapshot: ${escapeHtml(snapshotDate)} · ${table.rows.length} dòng</p>
    <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
    <script>window.addEventListener('load',()=>window.print());</script></body></html>`);
  printWindow.document.close();
}
