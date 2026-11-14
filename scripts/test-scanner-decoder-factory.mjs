import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const makeDataModule = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');

const adapterSource = await read('../src/platform/scanner/decoders/decoderAdapter.ts');
const factorySource = await read('../src/platform/scanner/decoders/decoderFactory.ts');
const sessionSource = await read('../src/platform/scanner/universalScannerSession.ts');

assert.match(adapterSource, /export interface ScannerDecoderAdapter/);
assert.match(adapterSource, /export interface ScannerDecoderFactory\s*\{\s*create\(\): Promise<ScannerDecoderAdapter>;/,
  'the factory must return an uninitialized adapter through a backend-neutral contract');
assert.match(adapterSource, /initialize\(options: DecoderInitOptions\): Promise<void>/);
assert.match(adapterSource, /decode\(source: CanvasImageSource, options: DecoderDecodeOptions\): Promise<DecoderOutput\[]>/);
assert.match(adapterSource, /decodeTemporalSnapshot\(/);
assert.match(adapterSource, /dispose\(\): Promise<void> \| void/);

assert.match(factorySource, /defaultScannerDecoderFactory:\s*ScannerDecoderFactory/);
assert.match(factorySource, /await import\('\.\/zxingWasmDecoder'\)/,
  'the production factory must lazily load the ZXing-C++ WASM backend');
assert.match(factorySource, /return new ZXingWasmDecoderAdapter\(\)/);
assert.doesNotMatch(factorySource, /zxingDecoder|ZXingDecoderAdapter/,
  'the production factory must not retain a legacy JS selection path');
assert.doesNotMatch(sessionSource, /zxingDecoder|ZXingDecoderAdapter/,
  'UniversalScannerSession must not import, name or instantiate a concrete backend');
assert.match(sessionSource, /private readonly decoderFactory: ScannerDecoderFactory = defaultScannerDecoderFactory/);
assert.match(sessionSource, /const decoder = await this\.decoderFactory\.create\(\)/);
assert.match(sessionSource, /await decoder\.initialize\(\{ formats: this\.options\.formats \}\)/);

const previewReadyAt = sessionSource.indexOf('this.options.onPreviewReady?.()');
const createAt = sessionSource.indexOf('await this.createDecoder(generation)', previewReadyAt);
assert.ok(previewReadyAt >= 0 && createAt > previewReadyAt,
  'decoder factory execution must remain after the first usable preview is published');

// Execute the real session method with a custom factory. The test proves the
// injection seam, format handoff, stale-generation disposal and init rollback.
const sessionStubs = {
  './contracts': makeDataModule('export const DEFAULT_SCANNER_CAMERA_REQUEST = { facingMode: "environment", preferredWidth: 1920, preferredHeight: 1080, preferredFrameRate: 30, maxFrameRate: 30 };'),
  '../../shared/services/cameraSession': makeDataModule('export async function acquireCameraLease() { throw new Error("not expected"); } export function subscribeCameraTrackEnded() { return () => {}; }'),
  './decoders/decoderFactory': makeDataModule('export const defaultScannerDecoderFactory = { async create() { throw new Error("default factory must not run in injection tests"); } };'),
  './barcodeValidation': makeDataModule('export function validateBarcodePayload(value) { return { valid: true, value, reason: "" }; }'),
  './scannerLifecycleAdapter': makeDataModule('export class ScannerLifecycleAdapter { constructor() {} opening() {} ready() {} scanning() {} sessionCloseStarted() {} cameraLeaseReleased() {} disposed() {} }'),
  './scannerTorch': makeDataModule('export async function applyScannerTorch(track, enabled) { return { supported: true, enabled, pending: false }; } export function readScannerTorchState() { return { supported: false, enabled: false, pending: false }; }'),
  './scannerFocusQuality': makeDataModule('export class ScannerFocusQualityMonitor { observe() { return false; } reset() {} }'),
  './scannerTemporalRecognition': makeDataModule('export class ScannerTemporalFrameBuffer { push() { return true; } clear() {} }'),
  './scannerAdaptiveRuntimeController': makeDataModule('export class ScannerAdaptiveRuntimeController { getBudget() { return { schemaVersion: 1, mode: "normal", maxImageCandidates: 2, maxGeometryCandidates: 4, reasons: ["test"] }; } observe() { return this.getBudget(); } reset() {} }'),
};
const compiledSession = ts.transpileModule(sessionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
let isolatedSession = compiledSession;
for (const [specifier, url] of Object.entries(sessionStubs)) {
  isolatedSession = isolatedSession
    .replaceAll(`from '${specifier}';`, `from '${url}';`)
    .replaceAll(`from "${specifier}";`, `from "${url}";`);
}
const sessionUrl = makeDataModule(isolatedSession);
const { UniversalScannerSession } = await import(sessionUrl);
const options = { profile: 'HIGH', formats: ['CODE_128'], mode: 'single', onResult: () => {} };

let createCalls = 0;
let initializedWith = null;
let disposeCalls = 0;
const injectedAdapter = {
  id: 'test-backend',
  async initialize(value) { initializedWith = value; },
  async decode() { return []; },
  async decodeTemporalSnapshot() { return []; },
  async dispose() { disposeCalls += 1; },
};
const injectedFactory = {
  async create() { createCalls += 1; return injectedAdapter; },
};
const injectedSession = new UniversalScannerSession({}, options, undefined, undefined, injectedFactory);
assert.equal(await injectedSession.createDecoder(0), injectedAdapter);
assert.equal(createCalls, 1, 'the injected factory must be used exactly once');
assert.deepEqual(initializedWith, { formats: ['CODE_128'] },
  'the session must initialize the returned adapter with the active format allowlist');
assert.equal(disposeCalls, 0, 'a successfully initialized adapter remains owned by the session');

let staleInitializeCalls = 0;
let staleDisposeCalls = 0;
const staleSession = new UniversalScannerSession({}, options, undefined, undefined, {
  async create() {
    return {
      id: 'stale-backend',
      async initialize() { staleInitializeCalls += 1; },
      async decode() { return []; },
      async decodeTemporalSnapshot() { return []; },
      async dispose() { staleDisposeCalls += 1; },
    };
  },
});
staleSession.generation = 1;
assert.equal(await staleSession.createDecoder(0), null,
  'a decoder created for an obsolete session generation must not be initialized');
assert.equal(staleInitializeCalls, 0);
assert.equal(staleDisposeCalls, 1, 'a stale adapter must be disposed immediately');

let failedDisposeCalls = 0;
const failedSession = new UniversalScannerSession({}, options, undefined, undefined, {
  async create() {
    return {
      id: 'failed-backend',
      async initialize() { throw new Error('initialization failed'); },
      async decode() { return []; },
      async decodeTemporalSnapshot() { return []; },
      async dispose() { failedDisposeCalls += 1; },
    };
  },
});
await assert.rejects(failedSession.createDecoder(0), /initialization failed/);
assert.equal(failedDisposeCalls, 1,
  'an adapter that fails initialization must be disposed before the error propagates');

console.log('Scanner decoder adapter/factory contract tests passed.');
