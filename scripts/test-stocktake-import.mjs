import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const parser = readFileSync("src/features/stocktake-import/services/stocktakeImportParser.ts", "utf8");
const component = readFileSync("src/features/stocktake-import/components/StocktakeImportModule.tsx", "utf8");
const store = readFileSync("src/features/stocktake-import/services/stocktakeImportStore.ts", "utf8");

function extractFunction(name, nextName) {
  const start = parser.indexOf("function " + name + "(");
  const end = parser.indexOf("\nfunction " + nextName + "(", start);
  assert.notEqual(start, -1, "Missing function " + name);
  assert.notEqual(end, -1, "Missing next function " + nextName);
  return parser.slice(start, end);
}

const runtimeSource =
  "const BARCODE_HEADERS = ['BARCODE','BAR CODE','PRODUCT BARCODE','EAN','EAN13','EAN8','UPC','GTIN'];" +
  "const FALLBACK_BARCODE_HEADERS = ['MA VACH','MA VACH HANG'];" +
  "const QUANTITY_HEADERS = ['SO LUONG','QUANTITY','QTY','SL','SO LUONG KIEM KE'];" +
  extractFunction("normalizeHeader", "decodeCell") +
  extractFunction("findHeader", "shiftDecimal") +
  extractFunction("shiftDecimal", "parseQuantity") +
  extractFunction("parseQuantity", "resolveZoneCode") +
  extractFunction("resolveZoneCode", "splitZoneCode") +
  extractFunction("splitZoneCode", "pad") +
  extractFunction("pad", "buildOutput") +
  extractFunction("buildOutput", "safeFilePart") +
  "return { normalizeHeader, findHeader, shiftDecimal, parseQuantity, formatBarcode, resolveZoneCode, splitZoneCode, buildOutput };";
const runtime = new Function(ts.transpile(runtimeSource, { target: ts.ScriptTarget.ES2022 }))();

assert.equal(runtime.normalizeHeader("SỐ LƯỢNG"), "SO LUONG");
assert.equal(runtime.normalizeHeader("MÃ VẠCH"), "MA VACH");
assert.equal(runtime.shiftDecimal("0.125", 2), "12.5");
assert.equal(runtime.shiftDecimal("0.005", 2), "0.5");
assert.equal(runtime.shiftDecimal("1e-3", 2), "0.1");
assert.equal(runtime.shiftDecimal("-0.25", 2), "-25");
assert.equal(runtime.parseQuantity("1,25", "s", false), "1.25");
assert.equal(runtime.parseQuantity("1.250", "n", false), "1.250");
assert.equal(runtime.parseQuantity("0.125", "n", true), "12.5%");
assert.equal(runtime.parseQuantity("25%", "s", false), "25%");
assert.equal(runtime.formatBarcode({ value: "89686011036", type: "n", styleIndex: 7 }, new Map([[7, 12]])), "089686011036");
assert.equal(runtime.formatBarcode({ value: "0089686011036", type: "s", styleIndex: 0 }, new Map()), "0089686011036");
assert.throws(() => runtime.parseQuantity("1,234.56", "s", false), /mơ hồ/);
assert.deepEqual(runtime.splitZoneCode("BT01"), { prefix: "BT", number: "01" });
assert.deepEqual(runtime.splitZoneCode("540"), { prefix: "", number: "540" });

const headerCells = new Map([
  [2, { value: "BARCODE", type: "s", styleIndex: 0 }],
  [4, { value: "SỐ LƯỢNG", type: "s", styleIndex: 0 }],
]);
assert.deepEqual(runtime.findHeader(new Map([[4, headerCells]])), {
  rowNumber: 4, barcodeColumn: 2, quantityColumn: 4, barcodeHeader: "BARCODE",
});

const zoneRows = new Map([[1, new Map([[0, { value: "540", type: "n", styleIndex: 0 }]])]]);
assert.equal(runtime.resolveZoneCode("Sheet1", zoneRows, 4), "540");
assert.equal(runtime.resolveZoneCode("BT01", new Map(), 4), "BT01");

const output = runtime.buildOutput("E001", "BT01", [
  { barcode: "089686011036", quantity: "1.25" },
  { barcode: "089686011037", quantity: "12.5%" },
], new Date(2026, 10, 10, 9, 8, 7));
assert.match(output, /^NHAN VIEN,E001,2026\/11\/10,09:08:07\r\nADRESSE,BT,01\r\n/);
assert.match(output, /ARTICLE,089686011036,1\.25/);
assert.match(output, /ARTICLE,089686011037,12\.5%/);

assert.match(parser, /xl\/workbook\.xml/);
assert.match(parser, /xl\/_rels\/workbook\.xml\.rels/);
assert.match(parser, /dataRows\.push\(\{ barcode, quantity, sourceRow: rowNumber \}\)/);
assert.doesNotMatch(parser, /fetch\s*\(/, "The offline parser must not make network requests.");
assert.match(component, /accept="\.xlsx/);
assert.match(component, /parseStocktakeWorkbook/);
assert.match(component, /PREVIEW OUTPUT/);
assert.match(component, /Xuất tất cả vùng thành ZIP/);
assert.match(store, /retailos-stocktake-import/);
assert.match(store, /clearHistory/);
assert.doesNotMatch(store, /retailos-stocktake['"]/);

console.log("Stocktake file import parser and offline workflow regression tests passed.");
