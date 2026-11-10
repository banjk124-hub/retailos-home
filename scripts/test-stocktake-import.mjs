import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const parser = readFileSync("src/features/stocktake-import/services/stocktakeImportParser.ts", "utf8");
const component = readFileSync("src/features/stocktake-import/components/StocktakeImportModule.tsx", "utf8");
const store = readFileSync("src/features/stocktake-import/services/stocktakeImportStore.ts", "utf8");
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
  return parser.slice(start, end).replace(/^export\\s+/gm, "");
}

const runtimeSource =
  "const BARCODE_HEADERS = ['BARCODE','BAR CODE','PRODUCT BARCODE','EAN','EAN13','EAN8','UPC','GTIN','MA BARCODE'];" +
  "const GOLD_CODE_HEADERS = ['GOLDCODE','GOLD CODE','GOLD_CODE','GOLD PRODUCT CODE'];" +
  "const FALLBACK_BARCODE_HEADERS = ['MA VACH','MA VACH HANG'];" +
  "const QUANTITY_HEADERS = ['SO LUONG','QUANTITY','QTY','SL','SO LUONG KIEM KE','SO LUONG THUC TE','KET QUA THUC TE','KET QUA KIEM KE','THUC TE','ACTUAL QTY','ACTUAL QUANTITY','COUNTED QTY','COUNTED QUANTITY','COUNT','RESULT','WEIGHT','MASS','KHOI LUONG'];" +
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

assert.throws(() => runtime.findHeaders(new Map([[8, new Map([
  [1, { value: "MÃ HÀNG NỘI BỘ", type: "s", styleIndex: 0 }],
  [3, { value: "THỰC TẾ (KG)", type: "s", styleIndex: 0 }],
])]])), /Không nhận diện được cặp cột/);

// BARCODE wins when present; GOLDCODE is the row-level fallback for materials without a sales barcode.
const widths = new Map();
assert.deepEqual(runtime.resolveBarcode(
  { value: "8936000829285", type: "s", styleIndex: 0 },
  { value: "MAT001", type: "s", styleIndex: 0 }, undefined, widths,
), { barcode: "8936000829285", source: "BARCODE" });
assert.deepEqual(runtime.resolveBarcode(
  { value: "", type: "s", styleIndex: 0 },
  { value: "MAT001", type: "s", styleIndex: 0 }, undefined, widths,
), { barcode: "MAT001", source: "GOLDCODE" });
assert.deepEqual(runtime.resolveBarcode(undefined,
  { value: "MAT002", type: "s", styleIndex: 0 }, undefined, widths),
{ barcode: "MAT002", source: "GOLDCODE" });
assert.deepEqual(runtime.resolveBarcode(undefined, undefined,
  { value: "*089686011036*", type: "s", styleIndex: 0 }, widths),
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

assert.match(parser, /xl\/workbook\.xml/);
assert.match(parser, /xl\/_rels\/workbook\.xml\.rels/);
assert.match(parser, /blockingIssues\.push/);
assert.match(parser, /zonesByCode\.get\(zoneCode\)/);
assert.match(parser, /fileName: buildZoneFileName\(zoneCode\)/);
assert.doesNotMatch(parser, /fetch\s*\(/, "The offline parser must not make network requests.");
assert.match(component, /saveActiveZone/);
assert.match(component, /updateRow/);
assert.match(component, /Chỉnh sửa/);
assert.match(component, /Lưu vùng/);
assert.match(component, /PAGE_SIZE = 100/);
assert.match(component, /blockingIssues\.length/);
assert.doesNotMatch(component, /slice\(0,\s*80\)/);
assert.match(store, /retailos-stocktake-import/);
assert.match(store, /rows: zone\.rows/);
assert.match(store, /blockingIssues: \[\.\.\.result\.blockingIssues\]/);
assert.doesNotMatch(store, /retailos-module-data|retailos-stocktake['"]/);
assert.ok(registry.includes("export type RetailModuleId = typeof RETAIL_MODULE_IDS[number]"));
assert.doesNotMatch(registry, /ModuleDataId/, "Workflow identity must not depend on snapshot identity.");
assert.equal(snapshotService.includes("stocktake-import"), false, "The local workflow must not enter snapshot synchronization.");
assert.match(styles, /grid-template-columns:210px minmax\(0,1fr\)/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /@media \(max-width:640px\)/);

console.log("Stocktake import accuracy, GoldCode fallback, multi-layout parsing, editor and responsive UI tests passed.");
