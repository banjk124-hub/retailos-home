import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const optionsSource = await read('../src/platform/scanner/decoders/zxingWasmOptions.ts');
const compiled = ts.transpileModule(optionsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { createZXingWasmReaderOptions, runOrderedBinarizerFallback, isZXingWasmReadResultValid } = await import(moduleUrl);

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

const attempts = [];
const fallbackOutput = await runOrderedBinarizerFallback(
  ['LocalAverage', 'GlobalHistogram'],
  async (binarizer) => {
    attempts.push(binarizer);
    return binarizer === 'LocalAverage' ? [] : [{ text: '8938505974195' }];
  },
  (results) => results[0]?.text ?? null,
);
assert.deepEqual(attempts, ['LocalAverage', 'GlobalHistogram']);
assert.equal(fallbackOutput, '8938505974195');

const firstHitAttempts = [];
const firstHit = await runOrderedBinarizerFallback(
  ['LocalAverage', 'GlobalHistogram'],
  async (binarizer) => { firstHitAttempts.push(binarizer); return [{ text: 'first-hit' }]; },
  (results) => results[0]?.text ?? null,
);
assert.equal(firstHit, 'first-hit');
assert.deepEqual(firstHitAttempts, ['LocalAverage'], 'fallback must stop after the first accepted result');

assert.equal(isZXingWasmReadResultValid({ isValid: true, text: '123' }), true);
assert.equal(isZXingWasmReadResultValid({ isValid: false, text: '123' }), false);
assert.equal(isZXingWasmReadResultValid({ error: 'ChecksumError' }), false);

const wasm = await read('../src/platform/scanner/decoders/zxingWasmDecoder.ts');
const legacy = await read('../src/platform/scanner/decoders/zxingDecoder.ts');
assert.match(legacy, /\[HybridBinarizer, GlobalHistogramBinarizer\]/,
  'legacy decoder confirms ordered Hybrid then GlobalHistogram attempts');
assert.match(wasm, /\['LocalAverage', 'GlobalHistogram'\]/,
  'WASM backend must preserve the same two-stage binarizer fallback');
assert.match(wasm, /isZXingWasmReadResultValid\(result\)/,
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

assert.match(wasm, /if \(this\.disposed \|\| !this\.options \|\| !Number\.isFinite\(timestamp\)/,
  'temporal fallback must fail closed after disposal or invalid snapshots');
assert.match(wasm, /if \(this\.disposed \|\| !pipelineResult\.output\) return \[\];/,
  'temporal fallback must not deliver output after disposal');
assert.match(wasm, /this\.disposed = true;/);
assert.match(wasm, /this\.canvas = null;/);
assert.match(wasm, /this\.context = null;/);

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
