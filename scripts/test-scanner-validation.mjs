import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/platform/scanner/barcodeValidation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = \`data:text/javascript;base64,\${Buffer.from(compiled).toString("base64")}\`;
const { validateBarcodePayload, hasValidGs1CheckDigit } = await import(moduleUrl);

assert.equal(hasValidGs1CheckDigit("4006381333931"), true, "valid EAN-13 check digit");
assert.equal(validateBarcodePayload("4006381333931", "EAN_13").valid, true, "valid EAN-13 accepted");
assert.equal(validateBarcodePayload("96385074", "EAN_8").valid, true, "valid EAN-8 accepted");
assert.deepEqual(validateBarcodePayload("4006381333932", "EAN_13"), {
  valid: false,
  reason: "invalid-check-digit",
});
assert.equal(validateBarcodePayload("ABC 123", "CODE_128").valid, true, "CODE-128 remains opaque text");
assert.deepEqual(validateBarcodePayload("ABC\u0000 123", "CODE_128"), {
  valid: false,
  reason: "control-character",
});
console.log("Scanner barcode validation regression tests passed.");
