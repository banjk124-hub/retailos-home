import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const adapter = await read('../src/platform/scanner/decoders/decoderAdapter.ts');
const factory = await read('../src/platform/scanner/decoders/decoderFactory.ts');
const session = await read('../src/platform/scanner/universalScannerSession.ts');

assert.match(adapter, /export interface ScannerDecoderAdapter/,
  'decoder implementations must satisfy the shared adapter contract');
assert.match(adapter, /export interface ScannerDecoderFactory\s*\{\s*create\(\): Promise<ScannerDecoderAdapter>;/,
  'the factory must return an uninitialized adapter through a backend-neutral contract');
assert.match(adapter, /initialize\(options: DecoderInitOptions\): Promise<void>/);
assert.match(adapter, /decode\(source: CanvasImageSource, options: DecoderDecodeOptions\): Promise<DecoderOutput\[]>/);
assert.match(adapter, /decodeTemporalSnapshot\(/);
assert.match(adapter, /dispose\(\): Promise<void> \| void/);

assert.match(factory, /defaultScannerDecoderFactory:\s*ScannerDecoderFactory/,
  'the production default must be registered behind the factory interface');
assert.match(factory, /await import\('\.\/zxingDecoder'\)/,
  'the concrete backend must remain dynamically imported');
assert.match(factory, /return new ZXingDecoderAdapter\(\)/);

assert.doesNotMatch(session, /zxingDecoder|ZXingDecoderAdapter/,
  'UniversalScannerSession must not import, name or instantiate a concrete backend');
assert.match(session, /private readonly decoderFactory: ScannerDecoderFactory = defaultScannerDecoderFactory/,
  'the session must accept an injectable factory while preserving the current production default');
assert.match(session, /const decoder = await this\.decoderFactory\.create\(\)/);
assert.match(session, /if \(this\.disposed \|\| generation !== this\.generation\)\s*\{\s*await decoder\.dispose\(\);\s*return null;/,
  'a backend created for a stale session generation must be disposed before initialization');
assert.match(session, /await decoder\.initialize\(\{ formats: this\.options\.formats \}\)/,
  'the session remains responsible for initializing the adapter with its active format allowlist');
assert.match(session, /catch \(error\) \{\s*await decoder\.dispose\(\);\s*throw error;/,
  'a failed adapter initialization must dispose the partially initialized backend');

const previewReadyAt = session.indexOf('this.options.onPreviewReady?.()');
const createAt = session.indexOf('await this.createDecoder(generation)', previewReadyAt);
assert.ok(previewReadyAt >= 0 && createAt > previewReadyAt,
  'decoder factory execution must remain after the first usable preview is published');

console.log('Scanner decoder adapter/factory contract tests passed.');
