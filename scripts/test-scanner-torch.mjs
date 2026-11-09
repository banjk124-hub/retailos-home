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
let lastAppliedConstraints;
const supportedTrack = {
  readyState: 'live',
  getCapabilities: () => ({ torch: true }),
  getConstraints: () => lastAppliedConstraints ?? ({ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }),
  getSettings: () => ({ torch: enabled }),
  applyConstraints: async (constraints) => {
    applyCount += 1;
    lastAppliedConstraints = constraints;
    enabled = constraints.advanced[0].torch;
  },
};
assert.deepEqual(readScannerTorchState(supportedTrack), {
  supported: true, enabled: false, pending: false,
});
const turnedOn = await applyScannerTorch(supportedTrack, true);
assert.deepEqual(turnedOn, { supported: true, enabled: true, pending: false });
assert.equal(applyCount, 1, 'torch is applied through the active video track constraints');
assert.deepEqual(lastAppliedConstraints.width, { ideal: 1280 }, 'torch toggle preserves the width constraint');
assert.deepEqual(lastAppliedConstraints.height, { ideal: 720 }, 'torch toggle preserves the height constraint');
assert.deepEqual(lastAppliedConstraints.frameRate, { ideal: 30, max: 30 }, 'torch toggle preserves the frame-rate constraint');
assert.deepEqual(lastAppliedConstraints.advanced.at(-1), { torch: true });
const turnedOff = await applyScannerTorch(supportedTrack, false);
assert.equal(turnedOff.enabled, false);
assert.equal(applyCount, 2, 'torch can be disabled through the same track');
assert.deepEqual(lastAppliedConstraints.advanced, [{ torch: false }], 'disable replaces the prior torch:true constraint instead of stacking contradictory entries');

let fallbackConstraints;
const settingsOnlyTrack = {
  readyState: 'live',
  getCapabilities: () => ({ torch: true }),
  getSettings: () => ({ torch: false, width: 1280, height: 720, frameRate: 30, facingMode: 'environment', deviceId: 'rear-camera-1' }),
  applyConstraints: async (constraints) => { fallbackConstraints = constraints; },
};
await applyScannerTorch(settingsOnlyTrack, true);
assert.deepEqual(fallbackConstraints.width, { exact: 1280 }, 'settings fallback preserves active width');
assert.deepEqual(fallbackConstraints.height, { exact: 720 }, 'settings fallback preserves active height');
assert.deepEqual(fallbackConstraints.frameRate, { exact: 30 }, 'settings fallback preserves active frame rate');
assert.deepEqual(fallbackConstraints.facingMode, { exact: 'environment' }, 'settings fallback preserves the active rear-camera facing mode');
assert.deepEqual(fallbackConstraints.deviceId, { exact: 'rear-camera-1' }, 'settings fallback preserves the active camera device');

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

// Chromium can expose track capabilities only after the camera has begun
// producing live frames. The engine must re-read capabilities after preview
// readiness instead of permanently caching the immediate post-acquisition value.
let cameraStreaming = false;
const lateCapabilityTrack = {
  readyState: 'live',
  getCapabilities: () => cameraStreaming ? ({ torch: true }) : ({}),
  getSettings: () => ({ torch: false }),
  applyConstraints: async () => undefined,
};
assert.equal(readScannerTorchState(lateCapabilityTrack).supported, false);
cameraStreaming = true;
assert.equal(readScannerTorchState(lateCapabilityTrack).supported, true,
  'Torch capability becomes visible after camera streaming starts');


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
const videoPlayIndex = session.indexOf('await this.video.play()');
const videoFrameReadyIndex = session.indexOf('await waitForVideoFrameReady(this.video)');
const torchBindIndex = session.indexOf('this.bindTorchTrack(stream)');
assert.ok(videoPlayIndex >= 0 && videoFrameReadyIndex > videoPlayIndex,
  'camera playback and fresh-frame readiness precede Torch capability discovery');
assert.ok(torchBindIndex > videoFrameReadyIndex,
  'Torch capability is bound only after the first live video frame');
assert.match(session, /Torch capability/);

assert.match(session, /this\.torchTrack = null/);
assert.match(session, /generation !== this\.generation \|\| this\.torchTrack !== track/);

const cameraSession = await readFile(new URL('../src/shared/services/cameraSession.ts', import.meta.url), 'utf8');
assert.doesNotMatch(cameraSession, /torch/i, 'camera acquisition constraints must remain independent of optional Torch control');

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
