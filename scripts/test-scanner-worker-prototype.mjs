import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workerPath = new URL('../src/platform/scanner/decoders/scannerDecodeWorker.ts', import.meta.url);
const bridgePath = new URL('../src/platform/scanner/decoders/scannerDecodeWorkerBridge.ts', import.meta.url);
const worker = await readFile(workerPath, 'utf8');
const bridge = await readFile(bridgePath, 'utf8');

assert.match(worker, /protocolVersion:\s*1/);
assert.match(worker, /type:\s*'INIT'/);
assert.match(worker, /type:\s*'DECODE'/);
assert.match(worker, /type:\s*'CANCEL'/);
assert.match(worker, /type:\s*'DISPOSE'/);
assert.match(worker, /message\.width \* message\.height > 1_500_000/);
assert.match(worker, /message\.pixels\.byteLength !== message\.width \* message\.height \* 4/);
assert.match(worker, /generation !== message\.generation/);
assert.match(worker, /cancelled\.has\(message\.jobId\)/);
assert.match(worker, /prepareZXingModule/);
assert.match(worker, /readBarcodes/);
assert.match(worker, /createZXingWasmReaderOptions/);
assert.match(bridge, /new Worker\(new URL\('\.\/scannerDecodeWorker\.ts', import\.meta\.url\)/);
assert.match(bridge, /latest-frame-wins/);
assert.match(bridge, /this\.latestPending\?\.resolve\(\[\]\)/);
assert.match(bridge, /new Uint8ClampedArray\(frame\.frame\.data\)\.buffer/);
assert.match(bridge, /frame\.width \* frame\.height > 1_500_000/);
assert.match(bridge, /message\.generation !== this\.generation/);
assert.match(bridge, /worker\?\.terminate\(\)/);
console.log('Scanner SC-01A Worker prototype source-contract checks passed.');
