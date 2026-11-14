import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const optionsSource = await read('../src/platform/scanner/decoders/zxingWasmOptions.ts');
const compiled = ts.transpileModule(optionsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { createZXingWasmReaderOptions } = await import(moduleUrl);

const local = createZXingWasmReaderOptions(['EAN13', 'Code128'], 'LocalAverage');
const global = createZXingWasmReaderOptions(['EAN13', 'Code128'], 'GlobalHistogram');
for (const options of [local, global]) {
  assert.deepEqual(options.formats, ['EAN13', 'Code128']);
  // ZXing-C++ ODReader reverses every 1D scanline when tryHarder is true,
  // so upside-down linear symbols (180°) do not require tryRotate.
  // tryRotate stays false because the shared pipeline owns the 90° image candidate.
  assert.equal(options.tryHarder, true);
  assert.equal(options.tryRotate, false);
  assert.equal(options.tryInvert, true, 'WASM native inverted-symbol detection must remain enabled');
  assert.equal(options.tryDownscale, false);
  assert.equal(options.tryDenoise, false);
  assert.equal(options.maxNumberOfSymbols, 1);
  assert.equal(options.textMode, 'Plain');
  assert.equal(options.validateOptionalChecksum, false);
  assert.equal(options.returnErrors, true);
  assert.equal(options.characterSet, 'UTF8');
}
assert.equal(local.binarizer, 'LocalAverage');
assert.equal(global.binarizer, 'GlobalHistogram');

const wasm = await read('../src/platform/scanner/decoders/zxingWasmDecoder.ts');
const legacy = await read('../src/platform/scanner/decoders/zxingDecoder.ts');
assert.match(legacy, /\[HybridBinarizer, GlobalHistogramBinarizer\]/,
  'legacy decoder confirms ordered Hybrid then GlobalHistogram attempts');
assert.match(wasm, /\['LocalAverage', 'GlobalHistogram'\]/,
  'WASM backend must preserve the same two-stage binarizer fallback');
assert.match(wasm, /result\.isValid === false \|\| Boolean\(result\.error\)/,
  'WASM must reject invalid/error results before session validation');
assert.match(wasm, /onProcessingPlan:/,
  'WASM must retain A1/A2 processing-plan diagnostics');
assert.match(wasm, /createScannerImageQualityProfile/,
  'WASM must retain A1 quality profile diagnostics');
assert.match(wasm, /recordPipelineDiagnostics\(pipelineResult\)/,
  'WASM must retain rotation, deskew and geometry stage metrics');
assert.match(wasm, /recordStageCost\(stage, durationMs\)/,
  'WASM must retain per-stage timing metrics');
assert.match(wasm, /\[RetailOS Scanner\] Multi-format diagnostics/,
  'WASM must emit backend-neutral recognition diagnostics');

const diagnosticsStart = wasm.indexOf('  private emitDiagnostics(): void {');
const diagnosticsEnd = wasm.indexOf('\n  dispose(): void {', diagnosticsStart);
assert.ok(diagnosticsStart >= 0 && diagnosticsEnd > diagnosticsStart,
  'WASM diagnostics emitter must remain an explicit method');
const diagnosticsMethod = wasm.slice(diagnosticsStart, diagnosticsEnd);
for (const stateField of [
  'cachedOrientationHints', 'lastFocusAt', 'previousFocusPixels',
  'previousFocusKey', 'previousFocusWidth', 'previousFocusHeight',
  'lastImageQuality', 'lastImageQualityProfile', 'lastAdaptiveProcessingPlan',
]) {
  assert.doesNotMatch(
    diagnosticsMethod,
    new RegExp('this\\.' + stateField + '\\s*='),
    `diagnostics window rollover must not reset recognition state: ${stateField}`,
  );
}
assert.match(diagnosticsMethod, /this\.diagnosticFrames = 0/);
assert.match(diagnosticsMethod, /this\.diagnosticDecoded = 0/);

console.log('Scanner decoder capability parity tests passed.');
