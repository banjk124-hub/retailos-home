import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const lock = JSON.parse(await read('package-lock.json'));

assert.equal(pkg.dependencies['@zxing/library'], undefined,
  'ZXing JS must not remain a direct runtime dependency');
assert.equal(lock.packages['node_modules/@zxing/library'], undefined,
  'the lockfile must not retain the removed ZXing JS package');
assert.equal(lock.packages[''].dependencies['@zxing/library'], undefined,
  'the lockfile root dependency set must be WASM-only');
assert.equal(pkg.dependencies['zxing-wasm'], '3.1.6',
  'the pinned ZXing-C++ WASM package remains the sole barcode engine dependency');

await assert.rejects(
  access(path.join(root, 'src/platform/scanner/decoders/zxingDecoder.ts')),
  'the legacy ZXing JS adapter source must be deleted',
);

const factory = await read('src/platform/scanner/decoders/decoderFactory.ts');
assert.match(factory, /await import\('\.\/zxingWasmDecoder'\)/);
assert.match(factory, /new ZXingWasmDecoderAdapter\(\)/);
assert.doesNotMatch(factory, /zxingDecoder|ZXingDecoderAdapter/);

const benchmark = await read('scripts/scanner-benchmark/main.js');
assert.match(benchmark, /ZXingWasmDecoderAdapter/);
assert.doesNotMatch(benchmark, /zxing-js|ZXingDecoderAdapter/,
  'the developer benchmark must not retain a retired JS comparison path');

console.log('Scanner WASM-only architecture and legacy cleanup contract tests passed.');
