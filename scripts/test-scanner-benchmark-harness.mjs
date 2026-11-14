import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./scanner-benchmark/index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('./scanner-benchmark/main.js', import.meta.url), 'utf8');
const core = await readFile(new URL('./scanner-benchmark/core.mjs', import.meta.url), 'utf8');

assert.match(html, /type="module" src="\.\/main\.js"/);
assert.match(html, /type="file" accept="application\/json/);
assert.match(main, /ZXingWasmDecoderAdapter/);
assert.doesNotMatch(main, /ZXingDecoderAdapter|zxing-js/,
  'the benchmark must exercise only the production WASM engine');
assert.match(main, /scanRegion: item\.scanRegion/);
assert.match(main, /adapter\.dispose\(\)/);
assert.match(main, /initErrorName/);
assert.match(main, /appendFailureRows/);
assert.match(main, /geometryAvailable/);
assert.match(main, /outcome: classify\(outputs, item\.expected\)/);
assert.doesNotMatch(main, /getUserMedia|mediaDevices|requestCameraLease|UniversalScannerSession/,
  'the benchmark must not acquire cameras or create production sessions');
assert.doesNotMatch(main, /results:.*value|output\.value\s*[,}]/s,
  'exported result rows must not contain decoded payload values');
assert.match(core, /source-frame-normalized/);
assert.match(core, /parent traversal/);

console.log('Scanner dev-only benchmark harness isolation tests passed.');
