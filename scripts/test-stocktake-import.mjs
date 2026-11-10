import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const parser = readFileSync("src/features/stocktake-import/services/stocktakeImportParser.ts", "utf8");
const component = readFileSync("src/features/stocktake-import/components/StocktakeImportModule.tsx", "utf8");
const store = readFileSync("src/features/stocktake-import/services/stocktakeImportStore.ts", "utf8");
const sessionService = readFileSync("src/features/stocktake-import/services/stocktakeImportSession.ts", "utf8");
const registry = readFileSync("src/features/home/moduleRegistry.ts", "utf8");
const snapshotService = readFileSync("src/features/data/moduleDataService.ts", "utf8");
const styles = readFileSync("src/features/stocktake-import/components/stocktake-import.css", "utf8");

function extractFunction(name, nextName) {
  const start = parser.indexOf("function " + name + "(");
  const candidates = [
    parser.indexOf("\nfunction " + nextName + "(", start),
    parser.indexOf("\nexport function " + nextName + "(", start),
    parser.indexOf("\nexport async function " + nextName + "(", start),
  ].filter((index) => index >= 0);
  const end = candidates.length ? Math.min(...candidates) : -1;
  assert.notEqual(start, -1, "Missing function " + name);
  assert.notEqual(end, -1, "Missing next function " + nextName);
  return parser.slice(start, end).replace(/^export\s+/gm, "");
}

const runtimeSource =
  "const BARCODE_HEADERS = ['BARCODE','BAR CODE','PRODUCT BARCODE','EAN','EAN13','EAN8','UPC','GTIN','MA BARCODE'];" +
  "const CODE_HEADERS = ['CODE','ITEM CODE','PRODUCT CODE','MATERIAL CODE'];" +
  "const GOLD_CODE_HEADERS = ['GOLDCODE','GOLD CODE','GOLD_CODE','GOLD PRODUCT CODE'];" +
  "const TILL_CODE_HEADERS = ['TILLCODE','TILL CODE','TILL_CODE'];" +
  "const FALLBACK_BARCODE_HEADERS = ['MA VACH','MA VACH HANG'];" +
  "const QUANTITY_HEADERS = ['SO LUONG','QUANTITY','QTY','SL','SO LUONG KIEM KE','SO LUONG THUC TE','KET QUA THUC TE','KET QUA KIEM KE','THUC TE','ACTUAL QTY','ACTUAL QUANTITY','COUNTED QTY','COUNTED QUANTITY','COUNTED','COUNT','RESULT','KET QUA','ACTUAL','WEIGHT','NET WEIGHT','MASS','KHOI LUONG','TRONG LUONG','SO CAN','KL','THUC DEM'];" +
  "const ZONE_HEADERS = ['VUNG','ZONE','MA VUNG','ZONE CODE','KHU VUC'];" +
  extractFunction("normalizeHeader", "decodeCell") +
  extractFunction("matchesHeader", "findHeaders") +
  extractFunction("findHeaders", "expandDecimal") +
  extractFunction("expandDecimal", "incrementDigits") +
  extractFunction("incrementDigits", "roundDecimal") +
  extractFunction("roundDecimal", "generalPrecision") +
  extractFunction("generalPrecision", "numberFormatPrecision") +
  extractFunction("numberFormatPrecision", "formatExcelNumber") +
  extractFunction("formatExcelNumber", "shiftDecimal") +
  extractFunction("shiftDecimal", "parseTextQuantity") +
  extractFunction("parseTextQuantity", "parseQuantityCell") +
  extractFunction("formatBarcode", "resolveBarcode") +
  extractFunction("resolveBarcode", "resolveZoneCode") +
  extractFunction("resolveZoneCode", "buildStocktakeOutput") +
  extractFunction("buildStocktakeOutput", "safeFilePart") +
  extractFunction("safeFilePart", "buildZoneFileName") +
  extractFunction("buildZoneFileName", "rowIssues") +
  extractFunction("rowIssues", "parseStocktakeWorkbook") +
  "return { normalizeHeader, matchesHeader, findHeaders, expandDecimal, roundDecimal, generalPrecision, numberFormatPrecision, formatExcelNumber, parseTextQuantity, formatBarcode, resolveBarcode, resolveZoneCode, buildStocktakeOutput, buildZoneFileName, rowIssues };";
const runtime = new Function(ts.transpile(runtimeSource, { target: ts.ScriptTarget.ES2022 }))();

const sessionModule = { exports: {} };
const sessionCode = ts.transpile(sessionService, {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
});
new Function("require", "exports", "module", sessionCode)(
  () => ({ buildStocktakeOutput: runtime.buildStocktakeOutput, buildZoneFileName: runtime.buildZoneFileName }),
  sessionModule.exports,
  sessionModule,
);
const sessionRuntime = sessionModule.exports;


assert.equal(runtime.normalizeHeader("SỐ LƯỢNG THỰC TẾ"), "SO LUONG THUC TE");
assert.equal(runtime.normalizeHeader("MÃ VẠCH"), "MA VACH");

// Exact decimal formatting follows Excel's displayed precision, not the raw IEEE-like XML token.
assert.equal(runtime.formatExcelNumber("19.236000000000001", "General"), "19.236");
assert.equal(runtime.formatExcelNumber("19.236000000000001", "#,##0.000"), "19.236");
assert.equal(runtime.formatExcelNumber("19.236000000000001", "0.00"), "19.24");
assert.equal(runtime.formatExcelNumber("19.236000000000001", "0.000"), "19.236");
assert.equal(runtime.formatExcelNumber("0.125", "0.0%"), "12.5%");
assert.equal(runtime.formatExcelNumber("0.125", "0.00%"), "12.50%");
assert.equal(runtime.formatExcelNumber("1e-3", "0.000"), "0.001");
assert.equal(runtime.parseTextQuantity("19,236"), "19.236");
assert.equal(runtime.parseTextQuantity("1.250"), "1.250");
assert.throws(() => runtime.parseTextQuantity("1,234.56"), /mơ hồ/);

// Multiple tables in one sheet can use different column positions and aliases.
const table1 = new Map([
  [1, { value: "GOLDCODE", type: "s", styleIndex: 0 }],
  [3, { value: "KẾT QUẢ THỰC TẾ (KG)", type: "s", styleIndex: 0 }],
  [5, { value: "VÙNG", type: "s", styleIndex: 0 }],
]);
const table2 = new Map([
  [2, { value: "BARCODE", type: "s", styleIndex: 0 }],
  [4, { value: "SỐ LƯỢNG", type: "s", styleIndex: 0 }],
  [6, { value: "VÙNG", type: "s", styleIndex: 0 }],
]);
const scanned = runtime.findHeaders(new Map([[4, table1], [16, table2]]));
assert.equal(scanned.mappings.length, 2);
assert.deepEqual(scanned.mappings[0], {
  rowNumber: 4, quantityColumn: 3, goldCodeColumn: 1, barcodeHeader: "GOLDCODE", zoneColumn: 5,
});
assert.deepEqual(scanned.mappings[1], {
  rowNumber: 16, quantityColumn: 4, barcodeColumn: 2, barcodeHeader: "BARCODE", zoneColumn: 6,
});
assert.equal(scanned.unsupportedRows.length, 0);

const codeAndTillScan = runtime.findHeaders(new Map([[22, new Map([
  [1, { value: "CODE", type: "s", styleIndex: 0 }],
  [2, { value: "TILLCODE", type: "s", styleIndex: 0 }],
  [4, { value: "KẾT QUẢ THỰC TẾ", type: "s", styleIndex: 0 }],
])]]));
assert.equal(codeAndTillScan.mappings[0].codeColumn, 1);
assert.equal(codeAndTillScan.mappings[0].tillCodeColumn, 2);


assert.throws(() => runtime.findHeaders(new Map([[8, new Map([
  [1, { value: "MÃ HÀNG NỘI BỘ", type: "s", styleIndex: 0 }],
  [3, { value: "THỰC TẾ (KG)", type: "s", styleIndex: 0 }],
])]])), /Không nhận diện được cặp cột/);

// BARCODE wins when present; GOLDCODE is the row-level fallback for materials without a sales barcode.
const widths = new Map();
// Barcode source precedence: BARCODE -> CODE -> GOLDCODE -> TILLCODE -> legacy MÃ VẠCH.
const cell = (value) => ({ value, type: "s", styleIndex: 0 });
assert.deepEqual(runtime.resolveBarcode(cell("8936000829285"), cell("CODE1"), cell("GOLD1"), cell("TILL1"), undefined, widths),
  { barcode: "8936000829285", source: "BARCODE" });
assert.deepEqual(runtime.resolveBarcode(cell(""), cell("CODE1"), cell("GOLD1"), cell("TILL1"), undefined, widths),
  { barcode: "CODE1", source: "CODE" });
assert.deepEqual(runtime.resolveBarcode(undefined, undefined, cell("GOLD1"), cell("TILL1"), undefined, widths),
  { barcode: "GOLD1", source: "GOLDCODE" });
assert.deepEqual(runtime.resolveBarcode(undefined, undefined, undefined, cell("TILL1"), undefined, widths),
  { barcode: "TILL1", source: "TILLCODE" });
assert.deepEqual(runtime.resolveBarcode(undefined, undefined, undefined, undefined, cell("*089686011036*"), widths),
  { barcode: "*089686011036*", source: "MÃ VẠCH" });
assert.equal(runtime.rowIssues("", "19.236").length, 1);
assert.equal(runtime.rowIssues("MAT001", "19.236").length, 0);

// Numeric barcode cells respect simple Excel zero-padding masks.
assert.equal(runtime.formatBarcode({ value: "89686011036", type: "n", styleIndex: 7 }, new Map([[7, 12]])), "089686011036");
assert.equal(runtime.formatBarcode({ value: "0089686011036", type: "s", styleIndex: 0 }, new Map()), "0089686011036");

// Same zone can collect different source table layouts; file name contains the zone only.
assert.deepEqual(runtime.resolveZoneCode("Sheet1", new Map([[1, new Map([[5, { value: "540", type: "n", styleIndex: 0 }]])]]), 4), "540");
assert.equal(runtime.buildZoneFileName("BT01"), "BT01.txt");
assert.equal(runtime.buildZoneFileName("540"), "540.txt");
const output = runtime.buildStocktakeOutput("E001", "BT01", [
  { barcode: "089686011036", quantity: "19.236", sourceRow: 5, sourceSheet: "BT01", barcodeSource: "BARCODE", issues: [] },
], new Date(2026, 10, 10, 9, 8, 7));
assert.match(output, /^NHAN VIEN,E001,2026\/11\/10,09:08:07\r\nADRESSE,BT,01\r\n/);
assert.match(output, /ARTICLE,089686011036,19\.236/);

const source = (name, fingerprint) => ({ name, fingerprint, size: 100, lastModified: 1 });
const importedRow = (barcode, sourceFileName, sourceRow) => ({
  barcode, quantity: "1", sourceRow, sourceSheet: "BT01", sourceFileName, sourceFileId: sourceFileName.slice(0, 8),
  barcodeSource: "BARCODE", issues: [],
});
const zone = (zoneCode, rows) => ({
  zoneCode, prefix: "BT", number: zoneCode.slice(2), sheetName: zoneCode,
  rows, content: "", fileName: zoneCode + ".txt",
});
const sessionBase = {
  sourceFileName: "base.xlsx", sourceFiles: [source("base.xlsx", "base-hash")],
  importedAt: "2026-11-10T09:00:00.000Z",
  zones: [zone("BT01", [importedRow("BASE", "base.xlsx", 1)])],
  warnings: [], blockingIssues: [],
};
const sessionA = {
  sourceFileName: "a.xlsx", sourceFiles: [source("a.xlsx", "a-hash")],
  importedAt: "2026-11-10T10:00:00.000Z",
  zones: [zone("BT01", [importedRow("A1", "a.xlsx", 2), importedRow("A2", "a.xlsx", 3)]),
    zone("BT02", [importedRow("A3", "a.xlsx", 4)])],
  warnings: [], blockingIssues: [],
};
const sessionB = {
  sourceFileName: "b.xlsx", sourceFiles: [source("b.xlsx", "b-hash")],
  importedAt: "2026-11-10T10:01:00.000Z",
  zones: [zone("BT01", [importedRow("A1", "b.xlsx", 5)])],
  warnings: [], blockingIssues: [],
};
assert.deepEqual(sessionRuntime.detectStocktakeImportConflicts(sessionBase, [sessionA, sessionB]), [
  { zoneCode: "BT01", existingRows: 1, incomingRows: 3, duplicateWithinBatch: true },
]);
const mergedSession = sessionRuntime.mergeStocktakeImportSession(sessionBase, [sessionA, sessionB], "E001", true);
assert.equal(mergedSession.importedAt, sessionBase.importedAt, "Appending files must preserve the session timestamp.");
assert.deepEqual(mergedSession.zones.map((item) => item.zoneCode), ["BT01", "BT02"]);
assert.deepEqual(mergedSession.zones[0].rows.map((row) => row.barcode), ["BASE", "A1", "A2", "A1"]);
assert.equal(mergedSession.zones[0].rows[1].sourceFileName, "a.xlsx");
assert.equal(mergedSession.zones[0].rows[3].sourceFileName, "b.xlsx");
assert.equal(mergedSession.zones[0].rows[1].sourceFileId, "a.xlsx".slice(0, 8));
assert.equal(mergedSession.zones[0].rows.length, 4, "Merge must preserve every row and duplicate occurrence.");
assert.equal(mergedSession.sourceFiles.length, 3);
assert.match(mergedSession.warnings.join(" "), /Đã gộp 2 dòng bổ sung vào vùng BT01/);
assert.match(mergedSession.warnings.join(" "), /Đã gộp 1 dòng bổ sung vào vùng BT01/);
assert.ok(mergedSession.zones[0].content.includes("NHAN VIEN,E001,2026/11/10,09:00:00"));
const skippedSession = sessionRuntime.mergeStocktakeImportSession(sessionBase, [sessionA, sessionB], "E001", false);
assert.deepEqual(skippedSession.zones[0].rows.map((row) => row.barcode), ["BASE"]);
assert.deepEqual(skippedSession.zones[1].rows.map((row) => row.barcode), ["A3"]);
assert.match(skippedSession.warnings.join(" "), /Đã bỏ qua 2 dòng bổ sung của vùng BT01/);
assert.match(skippedSession.warnings.join(" "), /Đã bỏ qua 1 dòng bổ sung của vùng BT01/);


assert.match(parser, /xl\/workbook\.xml/);
assert.match(parser, /xl\/_rels\/workbook\.xml\.rels/);
assert.match(parser, /blockingIssues\.push/);
assert.match(parser, /crypto\.subtle\.digest/);
assert.match(parser, /sourceFileName: file\.name/);
assert.match(parser, /sourceFileId: fingerprint\.slice\(0, 16\)/);
assert.match(parser, /zonesByCode\.get\(zoneCode\)/);
assert.match(parser, /fileName: buildZoneFileName\(zoneCode\)/);
assert.doesNotMatch(parser, /fetch\s*\(/, "The offline parser must not make network requests.");
assert.match(component, /saveActiveZone/);
assert.match(component, /function getRowIssues/);
assert.match(component, /multiple/);
assert.match(component, /knownFingerprints/);
assert.match(component, /batchFingerprints/);
assert.match(component, /readOnly/);
assert.match(component, /setSelectionRange/);
assert.match(component, /stopPropagation/);
assert.match(component, /navigator\.clipboard/);
assert.match(component, /disabled={!outputReady}/);
assert.match(component, /textarea ref={outputTextareaRef}/);
assert.match(component, /activeZone\.content/);
assert.match(component, /navigator\.clipboard\.writeText\(activeZone\.content\)/);
assert.match(component, /downloadText\(zone\.fileName, zone\.content\)/);
assert.match(component, /zip\.file\(zone\.fileName, zone\.content\)/);
assert.doesNotMatch(component, /document\.getSelection|selectAll/);
assert.match(component, /stocktake-import-editor-layer/);
assert.match(component, /stocktake-import-output-details/);
assert.match(component, /stocktake-import-table-toolbar/);
assert.match(component, /historyPersisted/);
assert.match(component, /noticeTone/);
assert.match(component, /busyAction/);
assert.match(component, /Xem trước TXT/);
assert.doesNotMatch(component, /zoneLayer|setZoneLayer/, "Editor and TXT preview must share one workspace instead of switching layers.");
assert.match(component, /handleFiles/);
assert.match(component, /confirmPendingImport/);
assert.match(component, /sameNameDifferentContent/);
assert.match(component, /zoneConflicts/);
assert.match(component, /Tạo phiên mới/);
assert.match(component, /sourceFileName/);
assert.match(component, /sourceFileId/);
assert.match(component, /updateRow/);
assert.match(component, /Chỉnh sửa/);
assert.match(component, /Lưu thay đổi/);
assert.match(component, /PAGE_SIZE = 100/);
assert.match(component, /blockingIssues\.length/);
assert.doesNotMatch(component, /slice\(0,\s*80\)/);
assert.match(store, /retailos-stocktake-import/);
assert.match(store, /rows: zone\.rows/);
assert.match(store, /sourceFiles/);
assert.match(sessionService, /detectStocktakeImportConflicts/);
assert.match(sessionService, /mergeStocktakeImportSession/);
assert.match(sessionService, /skippedZoneWarnings/);
assert.match(sessionService, /sourceFileName: sourceFiles.length/);
assert.match(store, /blockingIssues: \[\.\.\.result\.blockingIssues\]/);
assert.doesNotMatch(store, /retailos-module-data|retailos-stocktake['"]/);
assert.ok(registry.includes("export type RetailModuleId = typeof RETAIL_MODULE_IDS[number]"));
assert.ok(registry.includes("title: 'Xuất file'"));
assert.ok(registry.includes("workStatus: 'in-progress'"));
assert.ok(registry.includes("workStatus?: 'planned' | 'in-progress' | 'paused' | 'operational' | 'maintenance'"));
assert.doesNotMatch(registry, /ModuleDataId/, "Workflow identity must not depend on snapshot identity.");
assert.equal(snapshotService.includes("stocktake-import"), false, "The local workflow must not enter snapshot synchronization.");
assert.match(styles, /grid-template-columns:210px minmax\(0,1fr\)/);
assert.match(styles, /stocktake-import-output-textarea/);
assert.match(styles, /stocktake-import-preview-actions/);
assert.match(styles, /stocktake-import-workspace-enter/);
assert.match(styles, /stocktake-import-state/);
assert.doesNotMatch(styles, /stocktake-import-zone-layer-panel|stocktake-import-output-layer/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /@media \(max-width:640px\)/);

console.log("Stocktake import accuracy, code-source precedence, additive multi-file sessions, conflict review, unified workspace and responsive UI tests passed.");
