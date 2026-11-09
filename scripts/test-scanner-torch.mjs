import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const helperSource = await readFile(new URL('../src/platform/scanner/scannerTorch.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { readScannerTorchState, applyScannerTorch } = await import(helperUrl);

let enabled = false;
let applyCount = 0;
const supportedTrack = {
  readyState: 'live',
  getCapabilities: () => ({ torch: true }),
  getSettings: () => ({ torch: enabled }),
  applyConstraints: async (constraints) => {
    applyCount += 1;
    enabled = constraints.advanced[0].torch;
  },
};
assert.deepEqual(readScannerTorchState(supportedTrack), {
  supported: true, enabled: false, pending: false,
});
const turnedOn = await applyScannerTorch(supportedTrack, true);
assert.deepEqual(turnedOn, { supported: true, enabled: true, pending: false });
assert.equal(applyCount, 1, 'torch is applied through the active video track constraints');
const turnedOff = await applyScannerTorch(supportedTrack, false);
assert.equal(turnedOff.enabled, false);
assert.equal(applyCount, 2, 'torch can be disabled through the same track');

let unsupportedApplyCount = 0;
const unsupportedTrack = {
  readyState: 'live',
  getCapabilities: () => ({ torch: false }),
  getSettings: () => ({}),
  applyConstraints: async () => { unsupportedApplyCount += 1; },
};
assert.deepEqual(readScannerTorchState(unsupportedTrack), {
  supported: false, enabled: false, pending: false,
});
assert.equal((await applyScannerTorch(unsupportedTrack, true)).supported, false);
assert.equal(unsupportedApplyCount, 0, 'unsupported devices are never sent torch constraints');

const failingTrack = {
  ...supportedTrack,
  applyConstraints: async () => { throw new Error('hardware rejected torch'); },
};
const failed = await applyScannerTorch(failingTrack, true);
assert.equal(failed.supported, true);
assert.equal(failed.enabled, false);
assert.match(failed.error, /Không thể bật đèn flash/);

const contract = await readFile(new URL('../src/platform/scanner/contracts.ts', import.meta.url), 'utf8');
assert.match(contract, /onTorchStateChange\?: \(state: ScannerTorchState\) => void/);
assert.match(contract, /setTorchEnabled\(enabled: boolean\): Promise<ScannerTorchState>/);

const session = await readFile(new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url), 'utf8');
assert.match(session, /bindTorchTrack\(stream\)/);
assert.match(session, /this\.torchTrack = null/);
assert.match(session, /generation !== this\.generation \|\| this\.torchTrack !== track/);

const hook = await readFile(new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url), 'utf8');
assert.match(hook, /setTorchEnabled = useCallback/);
assert.match(hook, /onTorchStateChange: \(state\) =>/);

for (const path of [
  '../src/features/scanner/components/BarcodeScanner.tsx',
  '../src/features/stocktake/components/StocktakeScanner.tsx',
]) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  assert.match(source, /scanner\.torch\.supported/);
  assert.match(source, /scanner\.setTorchEnabled\(!scanner\.torch\.enabled\)/);
  assert.match(source, /aria-pressed=\{scanner\.torch\.enabled\}/);
}

console.log('Scanner torch capability, track control and module integration tests passed.');
