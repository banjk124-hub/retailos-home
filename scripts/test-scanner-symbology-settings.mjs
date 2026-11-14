import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
};
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const contractsSource = await read('../src/platform/scanner/contracts.ts');
const formatsMatch = contractsSource.match(/SUPPORTED_BARCODE_FORMATS = \[([\s\S]*?)\] as const/);
assert.ok(formatsMatch, 'platform contract exposes the explicit decoder capability list');
const formats = [...formatsMatch[1].matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
assert.equal(formats.length, 17, 'the engine exposes the 17 declared symbologies');

let storeSource = await read('../src/features/scanner/services/scannerSettingsStore.ts');
storeSource = storeSource.replace(
  "import { SUPPORTED_BARCODE_FORMATS, type SupportedBarcodeSymbology } from '../../../platform/scanner/contracts';",
  `const SUPPORTED_BARCODE_FORMATS = ${JSON.stringify(formats)} as const; type SupportedBarcodeSymbology = typeof SUPPORTED_BARCODE_FORMATS[number];`,
);
const storeCompiled = ts.transpileModule(storeSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const storeUrl = 'data:text/javascript;base64,' + Buffer.from(storeCompiled).toString('base64');
const store = await import(storeUrl);

assert.deepEqual(store.getEnabledScannerSymbologies(), ['EAN_8', 'EAN_13', 'CODE_128', 'CODE_39'],
  'the four existing formats remain enabled by default');
assert.equal(formats.filter((format) => store.getScannerSettings().symbologyEnabled[format]).length, 4,
  'all additional formats default to disabled');

const oldPreferences = JSON.stringify({ vibrationEnabled: false, beepVolume: 80 });
const legacySource = storeSource.replace(
  'const raw = localStorage.getItem(STORAGE_KEY);',
  `const raw = ${JSON.stringify(oldPreferences)};`,
);
const legacyCompiled = ts.transpileModule(legacySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const legacyUrl = 'data:text/javascript;base64,' + Buffer.from(legacyCompiled).toString('base64');
const legacyStore = await import(legacyUrl);
assert.equal(legacyStore.getScannerSettings().vibrationEnabled, false, 'legacy vibration preference is retained');
assert.equal(legacyStore.getScannerSettings().beepVolume, 80, 'legacy beep preference is retained');
assert.deepEqual(legacyStore.getEnabledScannerSymbologies(), ['EAN_8', 'EAN_13', 'CODE_128', 'CODE_39'],
  'legacy v1 preferences migrate to the original four enabled formats');

store.updateScannerSymbologyEnabled('UPC_A', true);
assert.ok(store.getEnabledScannerSymbologies().includes('UPC_A'), 'enabling adds a format to the allowlist');
store.updateScannerSymbologyEnabled('EAN_8', false);
assert.ok(!store.getEnabledScannerSymbologies().includes('EAN_8'), 'disabling removes a format from the allowlist');
assert.deepEqual(JSON.parse(stored.get('retailos.scannerSettings.v1')).symbologyEnabled,
  store.getScannerSettings().symbologyEnabled, 'symbology preferences persist in the existing local store');
for (const format of store.getEnabledScannerSymbologies()) store.updateScannerSymbologyEnabled(format, false);
assert.ok(store.getEnabledScannerSymbologies().length >= 1, 'the final enabled format cannot be disabled');

const hook = await read('../src/features/scanner/hooks/useScannerEngine.ts');
assert.ok(hook.includes('getEnabledScannerSymbologies()'),
  'every new Home/Stocktake session receives the current app allowlist');
assert.ok(!hook.includes('[...SUPPORTED_BARCODE_FORMATS]'),
  'the scanner hook no longer bypasses app preferences');
const session = await read('../src/platform/scanner/universalScannerSession.ts');
assert.ok(session.includes('!this.options.formats.includes(result.symbology)'),
  'session acceptance independently rejects output outside the app allowlist');
assert.ok(session.includes('disabled-format'), 'disabled format rejections are recorded');

const jsDecoder = await read('../src/platform/scanner/decoders/zxingDecoder.ts');
const wasmDecoder = await read('../src/platform/scanner/decoders/zxingWasmDecoder.ts');
for (const format of formats) {
  assert.ok(jsDecoder.includes(`${format}: BarcodeFormat.${format}`), `ZXing JS maps ${format}`);
  assert.ok(wasmDecoder.includes(`${format}:`), `ZXing-C++ WASM maps ${format}`);
}
assert.ok(wasmDecoder.includes("QRCodeModel2"), 'QR model variants normalize to the QR_CODE app setting');
assert.ok(wasmDecoder.includes("MicroPDF417"), 'PDF417 variants normalize to the PDF_417 app setting');
assert.ok(wasmDecoder.includes("ITF14"), 'ITF-14 variant normalizes to the ITF app setting');
const panel = await read('../src/features/scanner/components/ScannerSettingsPanel.tsx');
assert.ok(panel.includes('role="switch"'), 'symbology options use accessible switches');
assert.ok(panel.includes('updateScannerSymbologyEnabled'), 'switches update the persisted preference store');
assert.ok(panel.includes('Ít nhất một định dạng phải được bật'), 'the minimum-one-format rule is explained');
const css = await read('../src/styles/scanner-settings.css');
assert.ok(css.includes('.scanner-symbology-switch.is-on{background:#16a34a}'), 'enabled switches are green');

const validationSource = await read('../src/platform/scanner/barcodeValidation.ts');
const validationCompiled = ts.transpileModule(validationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const validationUrl = 'data:text/javascript;base64,' + Buffer.from(validationCompiled).toString('base64');
const { validateBarcodePayload } = await import(validationUrl);
assert.equal(validateBarcodePayload('036000291452', 'UPC_A').valid, true, 'valid UPC-A is accepted');
assert.equal(validateBarcodePayload('036000291453', 'UPC_A').reason, 'invalid-check-digit', 'invalid UPC-A check digit is rejected');
assert.equal(validateBarcodePayload('04252614', 'UPC_E').valid, true, 'valid UPC-E expands and passes GS1 check digit');
assert.equal(validateBarcodePayload('96385074', 'EAN_8').valid, true, 'legacy EAN-8 remains valid');
assert.equal(validateBarcodePayload('4006381333931', 'EAN_13').valid, true, 'legacy EAN-13 remains valid');
assert.equal(validateBarcodePayload('123456', 'ITF').valid, true, 'even-length numeric ITF is accepted');
assert.equal(validateBarcodePayload('ABC123', 'CODE_93').valid, true, 'printable Code 93 Extended payload is accepted');
assert.equal(validateBarcodePayload('HELLO-123', 'CODE_39').valid, true, 'legacy Code 39 remains valid');
assert.equal(validateBarcodePayload('hello', 'CODE_39').reason, 'invalid-character', 'Code 39 keeps its uppercase alphabet policy');
assert.equal(validateBarcodePayload('retail-qr', 'QR_CODE').valid, true, 'QR payload is treated as opaque text');
assert.equal(validateBarcodePayload('ABC' + String.fromCharCode(0), 'QR_CODE').reason, 'control-character', 'unsafe control characters are rejected');
console.log('Scanner configurable symbology settings, migration, allowlist and validation tests passed.');
