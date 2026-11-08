import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const adapterSource = await readFile(
  new URL('../src/platform/scanner/scannerLifecycleAdapter.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(adapterSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { ScannerLifecycleAdapter } = await import(moduleUrl);

const events = [];
const lifecycle = new ScannerLifecycleAdapter('test-session', (event) => events.push(event));
lifecycle.opening();
lifecycle.ready();
lifecycle.scanning();
// A suspend/resume cycle may publish readiness/scanning again.
lifecycle.opening();
lifecycle.ready();
lifecycle.scanning();
lifecycle.exitRequested();
lifecycle.cameraReleased();
lifecycle.exitPresentation();
lifecycle.disposed();

// Duplicate notifications must not create duplicate terminal milestones.
lifecycle.exitRequested();
lifecycle.cameraReleased();
lifecycle.exitPresentation();
lifecycle.disposed();

assert.deepEqual(events.map((event) => event.type), [
  'OPENING', 'READY', 'SCANNING', 'OPENING', 'READY', 'SCANNING', 'EXIT_REQUESTED',
  'CAMERA_RELEASED', 'EXIT_PRESENTATION', 'DISPOSED',
]);
assert.ok(events.every((event) => event.sessionId === 'test-session'));
assert.ok(events.every((event) => Number.isFinite(event.timestamp)));

// Early close is valid: READY and SCANNING are optional.
const earlyClose = [];
const earlyLifecycle = new ScannerLifecycleAdapter('early-session', (event) => earlyClose.push(event.type));
earlyLifecycle.opening();
earlyLifecycle.exitRequested();
earlyLifecycle.cameraReleased();
earlyLifecycle.disposed();
assert.deepEqual(earlyClose, ['OPENING', 'EXIT_REQUESTED', 'CAMERA_RELEASED', 'DISPOSED']);

// Feature presentation is optional and may finish after camera release.
const noPresentation = [];
const noPresentationLifecycle = new ScannerLifecycleAdapter('no-ui-session', (event) => noPresentation.push(event.type));
noPresentationLifecycle.opening();
noPresentationLifecycle.exitRequested();
noPresentationLifecycle.cameraReleased();
noPresentationLifecycle.disposed();
assert.equal(noPresentation.includes('EXIT_PRESENTATION'), false);

// Observer failures must never escape into engine cleanup.
const safeLifecycle = new ScannerLifecycleAdapter('safe-session', () => {
  throw new Error('feature observer failure');
});
assert.doesNotThrow(() => {
  safeLifecycle.exitRequested();
  safeLifecycle.cameraReleased();
  safeLifecycle.disposed();
});

const hookSource = await readFile(
  new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url),
  'utf8',
);
assert.ok(hookSource.includes('  cameraLeaseRequest = null,') && hookSource.includes('  lifecycle,') && hookSource.includes('}: Options)'), 'hook destructures lifecycle adapter');
assert.match(hookSource, /hapticFeedback,\\s*lifecycle,\\s*onResult:/);

const sessionSource = await readFile(
  new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url),
  'utf8',
);
const closeStart = sessionSource.indexOf('  close(): Promise<void> {');
const teardownStart = sessionSource.indexOf('  private async teardown(release: boolean): Promise<void> {', closeStart);
assert.ok(closeStart >= 0 && teardownStart > closeStart, 'close and teardown methods exist');
const closeBody = sessionSource.slice(closeStart, teardownStart);
const teardownEnd = sessionSource.indexOf('  private logStage(', teardownStart);
const teardownBody = sessionSource.slice(teardownStart, teardownEnd);

const exitRequestAt = closeBody.indexOf('this.lifecycle.exitRequested()');
const closeTeardownAt = closeBody.indexOf('await this.teardown(true)');
const disposedAt = closeBody.indexOf('this.lifecycle.disposed()');
assert.ok(exitRequestAt >= 0 && closeTeardownAt > exitRequestAt, 'EXIT_REQUESTED precedes close teardown');
assert.ok(disposedAt > closeTeardownAt, 'DISPOSED is emitted only after close awaits teardown');

const releaseAt = teardownBody.indexOf('lease?.release()');
const cameraEventAt = teardownBody.indexOf('this.lifecycle.cameraReleased()', releaseAt);
const decoderDisposeAt = teardownBody.indexOf('await decoder.dispose()', cameraEventAt);
assert.ok(releaseAt >= 0 && cameraEventAt > releaseAt, 'CAMERA_RELEASED follows lease release');
assert.ok(decoderDisposeAt > cameraEventAt, 'decoder disposal may continue after CAMERA_RELEASED');

console.log('Scanner lifecycle contract and teardown-order tests passed.');
