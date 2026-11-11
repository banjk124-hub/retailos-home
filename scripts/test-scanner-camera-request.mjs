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
  preferredWidth: 1280,
  preferredHeight: 720,
  preferredFrameRate: 30,
  maxFrameRate: 30,
};
const constraints = buildCameraVideoConstraints(rearDefault);
assert.deepEqual(constraints.facingMode, { ideal: 'environment' });
assert.deepEqual(constraints.width, { ideal: 1280 });
assert.deepEqual(constraints.height, { ideal: 720 });
assert.deepEqual(constraints.frameRate, { ideal: 30, max: 30 });

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
assert.ok(sourceCamera.includes('assertStreamCompatible(stream, cameraRequest)'), 'pending shared acquisitions must be checked against the caller intent');
assert.ok(sourceCamera.includes('cameraRequest: requestSnapshot'), 'the one-shot lease handoff must retain its module camera intent');

const sessionSource = await readFile(new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url), 'utf8');
assert.ok(sessionSource.includes('initialCameraLeaseRequest?.cameraRequest ?? cameraRequest'), 'the initial tap request is authoritative for the session intent');
assert.ok(sessionSource.includes('acquireCameraLease(this.cameraRequest)'), 'a replacement session reacquires using the preserved module intent');

const hookSource = await readFile(new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url), 'utf8');
assert.ok(hookSource.includes('cameraRequestRef.current'), 'the React bridge retains camera intent beyond the one-shot lease request');
assert.ok(hookSource.includes('replaceVideoSurface()'), 'recovery continues to create a fresh video surface');
assert.ok(hookSource.includes('disposeForRecovery()'), 'recovery continues to retire the previous session');

console.log('Scanner camera request constraints, compatibility, lease and recovery intent tests passed.');
