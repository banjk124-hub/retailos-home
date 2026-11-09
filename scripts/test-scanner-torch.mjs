import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const helperSource = await readFile(new URL('../src/platform/scanner/scannerTorch.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helperUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { readScannerTorchState, readScannerTorchDiagnostic, applyScannerTorch, probeScannerTorchConstraint } = await import(helperUrl);

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

const diagnosticTrack = {
  readyState: 'live',
  muted: false,
  getCapabilities: () => ({ torch: true }),
  getSettings: () => ({
    torch: false, facingMode: 'environment', width: 1920, height: 1080,
    frameRate: 30, deviceId: 'must-not-be-exposed',
  }),
  applyConstraints: async () => undefined,
};
const diagnosticStartedAt = performance.now();
const diagnostic = readScannerTorchDiagnostic(diagnosticTrack, 'first-frame', diagnosticStartedAt);
assert.equal(diagnostic.capabilityApi, 'available');
assert.equal(diagnostic.settingsApi, 'available');
assert.equal(diagnostic.torchCapability, true);
assert.equal(diagnostic.settingsTorch, false);
assert.equal(diagnostic.facingMode, 'environment');
assert.equal(diagnostic.width, 1920);
assert.equal(diagnostic.height, 1080);
assert.equal(diagnostic.applyConstraintsApi, true);
assert.equal(Object.hasOwn(diagnostic, 'deviceId'), false, 'diagnostics never expose a camera device identifier');

const missingCapabilityDiagnostic = readScannerTorchDiagnostic({
  readyState: 'live',
  muted: false,
  getCapabilities: () => ({}),
  getSettings: () => ({}),
}, '250ms', diagnosticStartedAt);
assert.equal(missingCapabilityDiagnostic.torchCapability, 'not-exposed');
assert.equal(missingCapabilityDiagnostic.settingsTorch, 'not-exposed');

const throwingDiagnostic = readScannerTorchDiagnostic({
  readyState: 'live',
  muted: true,
  getCapabilities: () => { throw new DOMException('blocked', 'NotAllowedError'); },
  getSettings: () => { throw new DOMException('blocked', 'NotReadableError'); },
}, '1000ms', diagnosticStartedAt);
assert.equal(throwingDiagnostic.capabilityApi, 'error');
assert.equal(throwingDiagnostic.capabilitiesErrorName, 'NotAllowedError');
assert.equal(throwingDiagnostic.settingsApi, 'error');
assert.equal(throwingDiagnostic.settingsErrorName, 'NotReadableError');


const failingTrack = {
  ...supportedTrack,
  applyConstraints: async () => { throw new Error('hardware rejected torch'); },
};
const failed = await applyScannerTorch(failingTrack, true);
assert.equal(failed.supported, true);
assert.equal(failed.enabled, false);
assert.match(failed.error, /Không thể bật đèn flash/);

// Explicit compatibility probe may test a live track even when Torch is not advertised.
// The pulse must preserve camera constraints, attempt OFF after ON, and never promote support.
let probeTorch = 'not-exposed';
const probeCalls = [];
let lastProbeConstraints;
const probeTrack = {
  readyState: 'live',
  getCapabilities: () => ({}),
  getSettings: () => ({ torch: probeTorch === 'not-exposed' ? undefined : probeTorch, width: 1280, height: 720, frameRate: 30, facingMode: 'environment' }),
  getConstraints: () => ({ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 }, advanced: [{ focusMode: 'continuous' }] }),
  applyConstraints: async (constraints) => {
    lastProbeConstraints = constraints;
    const requestedTorch = constraints.advanced.at(-1).torch;
    probeCalls.push(requestedTorch);
    probeTorch = requestedTorch;
  },
};
const probeResult = await probeScannerTorchConstraint(probeTrack, 0);
assert.equal(probeResult.status, 'completed');
assert.equal(probeResult.onAccepted, true);
assert.equal(probeResult.offAttempted, true);
assert.equal(probeResult.offAccepted, true);
assert.deepEqual(probeCalls, [true, false], 'probe sends one ON pulse and then restores OFF');
assert.equal(probeResult.settingsTorchBefore, 'not-exposed');
assert.equal(probeResult.settingsTorchAfter, false);
assert.equal(probeResult.trackReadyState, 'live');
assert.deepEqual(readScannerTorchState(probeTrack), {
  supported: false, enabled: false, pending: false,
}, 'a successful debug probe must not promote an unadvertised capability');
assert.deepEqual(lastProbeConstraints.advanced, [{ focusMode: 'continuous' }, { torch: false }]);

const rejectedProbe = await probeScannerTorchConstraint({
  readyState: 'live',
  getSettings: () => ({}),
  getConstraints: () => ({}),
  applyConstraints: async () => { throw new DOMException('Torch rejected', 'OverconstrainedError'); },
}, 0);
assert.equal(rejectedProbe.onAccepted, false);
assert.equal(rejectedProbe.onErrorName, 'OverconstrainedError');
assert.equal(rejectedProbe.offAttempted, false, 'OFF is not sent when ON was rejected');
assert.equal((await probeScannerTorchConstraint(null)).status, 'unavailable');


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
assert.match(session, /probeTorchCompatibility\(\)/);
assert.match(session, /probeScannerTorchConstraint\(track, 1200\)/);
assert.match(session, /startTorchDiagnostics\(track, this\.generation\)/);
assert.match(session, /delay: 250, sample: '250ms'/);
assert.match(session, /delay: 1000, sample: '1000ms'/);
assert.match(session, /delay: 2500, sample: '2500ms'/);
assert.match(session, /clearTorchDiagnosticTimers\(\)/);

assert.match(session, /this\.torchTrack = null/);
assert.match(session, /generation !== this\.generation \|\| this\.torchTrack !== track/);

const cameraSession = await readFile(new URL('../src/shared/services/cameraSession.ts', import.meta.url), 'utf8');
assert.doesNotMatch(cameraSession, /torch/i, 'camera acquisition constraints must remain independent of optional Torch control');

const hook = await readFile(new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url), 'utf8');
assert.match(hook, /setTorchEnabled = useCallback/);
assert.match(hook, /onTorchStateChange: \(state\) =>/);
assert.match(hook, /onTorchDiagnosticsChange: diagnosticsEnabled \? \(sample\) =>/);
assert.match(hook, /scannerDebug/);
assert.match(hook, /probeTorchCompatibility/);
assert.match(hook, /torchProbePending/);
assert.match(hook, /setTorchDiagnostics\(\(current\) => \[\.\.\.current\.slice\(-3\), sample\]\)/);

const diagnosticsPanel = await readFile(new URL('../src/features/scanner/components/ScannerTorchDiagnosticPanel.tsx', import.meta.url), 'utf8');
assert.match(diagnosticsPanel, /SCANNER TORCH DIAGNOSTICS/);
assert.match(diagnosticsPanel, /No deviceId/);
assert.match(diagnosticsPanel, /Probe Torch/);
assert.match(diagnosticsPanel, /physical LED actually illuminated/);

for (const path of [
  '../src/features/scanner/components/BarcodeScanner.tsx',
  '../src/features/stocktake/components/StocktakeScanner.tsx',
]) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  assert.match(source, /scanner\.torch\.supported/);
  assert.match(source, /scanner\.diagnosticsEnabled && <ScannerTorchDiagnosticPanel/);
  assert.match(source, /scanner\.setTorchEnabled\(!scanner\.torch\.enabled\)/);
  assert.match(source, /aria-pressed=\{scanner\.torch\.enabled\}/);
}

console.log('Scanner torch capability, track control and module integration tests passed.');
