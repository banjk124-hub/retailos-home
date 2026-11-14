import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const pkg = JSON.parse(await read('../package.json'));
const lock = JSON.parse(await read('../package-lock.json'));
const adapter = await read('../src/platform/scanner/decoders/zxingWasmDecoder.ts');
const candidateFactory = await read('../src/platform/scanner/decoders/zxingWasmDecoderFactory.ts');
const defaultFactory = await read('../src/platform/scanner/decoders/decoderFactory.ts');
const session = await read('../src/platform/scanner/universalScannerSession.ts');
const pipeline = await read('../src/platform/scanner/scannerEnhancementPipeline.ts');

assert.equal(pkg.dependencies['zxing-wasm'], '3.1.6');
assert.equal(lock.packages[''].dependencies['zxing-wasm'], '3.1.6');
assert.equal(lock.packages['node_modules/zxing-wasm'].version, '3.1.6');
assert.ok(adapter.includes("from 'zxing-wasm/reader'"));
assert.ok(adapter.includes("zxing-wasm/reader/zxing_reader.wasm?url"));
assert.ok(adapter.includes('fireImmediately: true'));
assert.ok(adapter.includes('executeScannerEnhancementPipelineAsync('));
assert.ok(adapter.includes("['LocalAverage', 'GlobalHistogram']"), 'WASM must preserve the legacy ordered binarizer fallback');
assert.ok(adapter.includes('decodeTemporalSnapshot('));
assert.ok(adapter.includes('resolveScannerRoiCrop(options.scanRegion, dimensions.width, dimensions.height)'));
assert.ok(/if \(!crop\) \{[\s\S]*?return \[\];/.test(adapter), 'invalid ROI must fail closed before candidate decoding');
assert.ok(adapter.includes('measureScannerFocusQuality('));
assert.ok(adapter.includes('createScannerTemporalSnapshot('));
assert.ok(adapter.includes('processingBudget: options.processingBudget'));
assert.ok(adapter.includes('reuseOrientationHints: !scale.baseline'));
assert.ok(!adapter.includes('readBarcodes(image, this.options)'),
  'raw frame decode must not bypass the shared candidate pipeline');
assert.ok(pipeline.includes('export async function executeScannerEnhancementPipelineAsync'));
assert.ok(!/getUserMedia|requestAnimationFrame|requestVideoFrameCallback|srcObject/.test(adapter));
assert.ok(candidateFactory.includes('zxingWasmDecoderFactory'));
assert.ok(candidateFactory.includes("await import('./zxingWasmDecoder')"));
assert.ok(defaultFactory.includes('new ZXingDecoderAdapter()'));
assert.ok(!defaultFactory.includes('zxingWasmDecoder'));
assert.ok(!defaultFactory.includes('ZXingWasmDecoderAdapter'));
assert.ok(!session.includes('zxingWasmDecoder'));
assert.ok(!session.includes('ZXingWasmDecoderAdapter'));

console.log('ZXing-C++ WASM shared recognition-pipeline contract tests passed.');
