import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/platform/scanner/cameraRequestResolver.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { buildCameraVideoConstraints, resolveCameraStreamCompatibility } = await import(moduleUrl);

const rearDefault = {
  facingMode: 'environment',
  preferredWidth: 1920,
  preferredHeight: 1080,
  preferredFrameRate: 30,
  maxFrameRate: 30,
};
const constraints = buildCameraVideoConstraints(rearDefault);
assert.deepEqual(constraints.facingMode, { ideal: 'environment' });
assert.deepEqual(constraints.width, { ideal: 1920 });
assert.deepEqual(constraints.height, { ideal: 1080 });
assert.deepEqual(constraints.frameRate, { ideal: 30, max: 30 });
assert.deepEqual(buildCameraVideoConstraints({ ...rearDefault, preferredFrameRate: 60, maxFrameRate: 24 }).frameRate,
  { ideal: 24, max: 24 }, 'a preferred frame rate above its hard ceiling is safely clamped');

assert.deepEqual(resolveCameraStreamCompatibility(rearDefault, {
  facingMode: 'environment', width: 640, height: 480, frameRate: 30,
}), { compatible: true, reason: 'compatible' },
'preferred dimensions are soft ideals; a lower negotiated resolution remains shareable');
assert.deepEqual(resolveCameraStreamCompatibility(rearDefault, {
  facingMode: 'user', frameRate: 30,
}), { compatible: false, reason: 'facing-mode-mismatch' },
'a known front/rear facing mismatch must not share an active stream');
assert.deepEqual(resolveCameraStreamCompatibility(rearDefault, {
  facingMode: 'environment', frameRate: 60,
}), { compatible: false, reason: 'frame-rate-exceeds-maximum' },
'a stream above a requested hard maximum must not be shared');
assert.deepEqual(resolveCameraStreamCompatibility(rearDefault, {}), {
  compatible: true, reason: 'compatible',
}, 'missing browser settings are unknown and must not cause a false incompatibility');

const sourceCamera = await readFile(new URL('../src/shared/services/cameraSession.ts', import.meta.url), 'utf8');
assert.ok(sourceCamera.includes('activeLeaseCount > 0'), 'an incompatible stream with active leases must not be replaced');
assert.ok(sourceCamera.includes('assertStreamCompatible(stream, cameraRequest, isInitiatingIntent)'), 'pending shared acquisitions must be checked against the caller intent');
assert.ok(sourceCamera.includes('cameraRequest: requestSnapshot'), 'the one-shot lease handoff must retain its module camera intent');

const sessionSource = await readFile(new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url), 'utf8');
assert.ok(sessionSource.includes('initialCameraLeaseRequest?.cameraRequest ?? cameraRequest'), 'the initial tap request is authoritative for the session intent');
assert.ok(sessionSource.includes('acquireCameraLease(this.cameraRequest)'), 'a replacement session reacquires using the preserved module intent');
assert.ok(sessionSource.includes("name === 'OverconstrainedError'"), 'camera compatibility conflicts map to the scanner constraint error');

const hookSource = await readFile(new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url), 'utf8');
assert.ok(hookSource.includes('cameraRequestRef.current'), 'the React bridge retains camera intent beyond the one-shot lease request');
assert.ok(hookSource.includes('replaceVideoSurface()'), 'recovery continues to create a fresh video surface');
assert.ok(hookSource.includes('disposeForRecovery()'), 'recovery continues to retire the previous session');

console.log('Scanner camera request constraints, compatibility, lease and recovery intent tests passed.');


// Exercise the production camera lease service with mocked browser media APIs.
const cameraSessionSource = await readFile(new URL('../src/shared/services/cameraSession.ts', import.meta.url), 'utf8');
const contractsSource = await readFile(new URL('../src/platform/scanner/contracts.ts', import.meta.url), 'utf8');
const contractsJs = ts.transpileModule(contractsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const contractsUrl = 'data:text/javascript;base64,' + Buffer.from(contractsJs).toString('base64');
const resolverUrl = moduleUrl;
const diagnosticsJs = 'export function getSafeCameraSettings(){return {}};';
const diagnosticsUrl = 'data:text/javascript;base64,' + Buffer.from(diagnosticsJs).toString('base64');
const cameraSessionJs = cameraSessionSource
  .replace("from './cameraDiagnostics';", `from '${diagnosticsUrl}';`)
  .replace("from '../../platform/scanner/contracts';", `from '${contractsUrl}';`)
  .replace("from '../../platform/scanner/cameraRequestResolver';", `from '${resolverUrl}';`);
const cameraSessionUrl = 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(cameraSessionJs, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64');
const cameraSession = await import(cameraSessionUrl);

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let mediaCalls = [];
let currentStream = null;
let deferredGetUserMedia = null;
const makeStream = (settings) => {
  let stopCount = 0;
  const track = {
    readyState: 'live',
    getSettings: () => ({ ...settings }),
    addEventListener: () => undefined,
    stop: () => { stopCount += 1; track.readyState = 'ended'; },
  };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    get stopCount() { return stopCount; },
  };
};
const installMedia = (getUserMedia) => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia } },
  });
};
try {
  mediaCalls = [];
  currentStream = makeStream({ facingMode: 'environment', frameRate: 30, width: 1280, height: 720 });
  installMedia(async (constraints) => { mediaCalls.push(constraints); return currentStream; });
  const sharedA = await cameraSession.acquireCameraLease(rearDefault);
  const sharedB = await cameraSession.acquireCameraLease({ ...rearDefault, preferredWidth: 640, preferredHeight: 480, preferredFrameRate: 15 });
  assert.equal(mediaCalls.length, 1, 'compatible requests reuse one getUserMedia stream');
  assert.equal(typeof sharedA.prepareForScanning, 'undefined', 'camera leases expose no post-preview focus setup');
  assert.equal(typeof sharedA.reapplyContinuousAutofocus, 'undefined', 'camera leases expose no focus re-arm operation');
  assert.equal(mediaCalls[0].video.facingMode.ideal, 'environment');
  assert.equal(mediaCalls[0].video.width.ideal, 1920);
  assert.deepEqual(mediaCalls[0].video.advanced[0], { focusMode: 'continuous' }, 'continuous autofocus is an optional getUserMedia preference, not a post-preview applyConstraints call');
  sharedA.release();
  assert.equal(currentStream.stopCount, 0, 'releasing one shared lease does not stop the stream');
  sharedB.release();
  assert.equal(currentStream.stopCount, 1, 'the final shared lease stops the stream');

  // The initiating request must accept the browser's negotiated best effort,
  // even when an ideal facing mode is unavailable on that device.
  mediaCalls = [];
  currentStream = makeStream({ facingMode: 'user', frameRate: 30 });
  installMedia(async (constraints) => { mediaCalls.push(constraints); return currentStream; });
  const bestEffortA = await cameraSession.acquireCameraLease(rearDefault);
  const bestEffortB = await cameraSession.acquireCameraLease(rearDefault);
  assert.equal(mediaCalls.length, 1, 'the same intent may share the stream negotiated by its own ideal request');
  bestEffortA.release();
  bestEffortB.release();

  mediaCalls = [];
  currentStream = makeStream({ facingMode: 'environment', frameRate: 60 });
  installMedia(async (constraints) => { mediaCalls.push(constraints); return currentStream; });
  await assert.rejects(cameraSession.acquireCameraLease(rearDefault),
    (error) => error?.name === 'OverconstrainedError',
    'the initiating request must still enforce its hard maxFrameRate ceiling');
  assert.equal(currentStream.stopCount, 1, 'a stream that violates the initiating hard ceiling is stopped and not cached');

  mediaCalls = [];
  currentStream = makeStream({ facingMode: 'environment', frameRate: 30 });
  installMedia(async (constraints) => { mediaCalls.push(constraints); return currentStream; });
  const rearLease = await cameraSession.acquireCameraLease(rearDefault);
  await assert.rejects(cameraSession.acquireCameraLease({ ...rearDefault, facingMode: 'user' }),
    (error) => error?.name === 'OverconstrainedError',
    'an incompatible request is rejected while the active stream has a lease');
  assert.equal(mediaCalls.length, 1, 'an incompatible request does not start a competing camera acquisition');
  rearLease.release();
  currentStream = makeStream({ facingMode: 'user', frameRate: 30 });
  const frontLease = await cameraSession.acquireCameraLease({ ...rearDefault, facingMode: 'user' });
  assert.equal(mediaCalls.length, 2, 'a new intent acquires a replacement stream after the previous final lease releases');
  assert.equal(mediaCalls[1].video.facingMode.ideal, 'user', 'the replacement acquisition uses the new module intent');
  frontLease.release();

  mediaCalls = [];
  let resolvePending;
  const pendingStream = makeStream({ facingMode: 'environment', frameRate: 30 });
  installMedia((constraints) => {
    mediaCalls.push(constraints);
    return new Promise((resolve) => { resolvePending = () => resolve(pendingStream); });
  });
  const pendingRear = cameraSession.acquireCameraLease(rearDefault);
  const pendingFront = cameraSession.acquireCameraLease({ ...rearDefault, facingMode: 'user' });
  const pendingFrontAssertion = assert.rejects(pendingFront, (error) => error?.name === 'OverconstrainedError',
    'a pending stream is checked against every waiting caller after settings resolve');
  assert.equal(mediaCalls.length, 1, 'in-flight acquisitions are coalesced before actual settings are known');
  resolvePending();
  const pendingRearLease = await pendingRear;
  await pendingFrontAssertion;
  pendingRearLease.release();

  mediaCalls = [];
  currentStream = makeStream({ facingMode: 'environment', frameRate: 30 });
  installMedia(async () => currentStream);
  const mutableIntent = { ...rearDefault };
  const unclaimed = cameraSession.requestCameraLease(mutableIntent);
  mutableIntent.facingMode = 'user';
  assert.equal(unclaimed.cameraRequest.facingMode, 'environment', 'the tap request snapshots module intent before it can be mutated');
  unclaimed.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(currentStream.stopCount, 1, 'cancelling an unclaimed tap request releases its eventual lease');
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete globalThis.window;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
}

console.log('Production camera lease sharing, conflict, pending acquisition and cancellation tests passed.');
