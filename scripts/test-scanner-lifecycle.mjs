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
lifecycle.sessionCloseStarted();
lifecycle.cameraLeaseReleased();

lifecycle.disposed();

// Duplicate notifications must not create duplicate terminal milestones.
lifecycle.sessionCloseStarted();
lifecycle.cameraLeaseReleased();

lifecycle.disposed();

assert.deepEqual(events.map((event) => event.type), [
  'OPENING', 'READY', 'SCANNING', 'OPENING', 'READY', 'SCANNING', 'SESSION_CLOSE_STARTED',
  'CAMERA_LEASE_RELEASED', 'DISPOSED',
]);
assert.ok(events.every((event) => event.sessionId === 'test-session'));
assert.ok(events.every((event) => Number.isFinite(event.timestamp)));

// Early close is valid: READY and SCANNING are optional.
const earlyClose = [];
const earlyLifecycle = new ScannerLifecycleAdapter('early-session', (event) => earlyClose.push(event.type));
earlyLifecycle.opening();
earlyLifecycle.sessionCloseStarted();
earlyLifecycle.cameraLeaseReleased();
earlyLifecycle.disposed();
assert.deepEqual(earlyClose, ['OPENING', 'SESSION_CLOSE_STARTED', 'CAMERA_LEASE_RELEASED', 'DISPOSED']);

// The platform lifecycle vocabulary contains technical milestones only.
// Feature presentation completion is deliberately not representable here.
assert.doesNotMatch(adapterSource, /exitPresentation|EXIT_PRESENTATION|notifyExitPresentation/);

// Observer failures must never escape into engine cleanup.
const safeLifecycle = new ScannerLifecycleAdapter('safe-session', () => {
  throw new Error('feature observer failure');
});
assert.doesNotThrow(() => {
  safeLifecycle.sessionCloseStarted();
  safeLifecycle.cameraLeaseReleased();
  safeLifecycle.disposed();
});

const hookSource = await readFile(
  new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url),
  'utf8',
);
assert.ok(hookSource.includes('  cameraLeaseRequest = null,') && hookSource.includes('  lifecycleObserver,') && hookSource.includes('}: Options)'), 'hook accepts feature lifecycle observer');
assert.ok(hookSource.includes('lifecycleObserverRef.current = lifecycleObserver;') && hookSource.includes('lifecycleObserver: (event) => lifecycleObserverRef.current?.(event)'), 'hook forwards latest observer without restarting the session effect');
assert.ok(hookSource.includes('if (previousSession) recoveryRetiredSessionRef.current = previousSession;') && hookSource.includes('sessionRef.current ?? recoveryRetiredSessionRef.current'), 'hook retains only a recovery-retired session for terminal technical close');
assert.doesNotMatch(hookSource, /lifecycleSessionRef|notifyExitPresentation|EXIT_PRESENTATION/, 'hook must not retain sessions for or expose presentation completion');

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

const closeStartedAt = closeBody.indexOf('this.lifecycle.sessionCloseStarted()');
const closeTeardownAt = closeBody.indexOf('await this.teardown(true)');
const disposedAt = closeBody.indexOf('this.lifecycle.disposed()', closeTeardownAt);
assert.ok(closeStartedAt >= 0 && closeTeardownAt > closeStartedAt, 'SESSION_CLOSE_STARTED precedes close teardown');
assert.ok(disposedAt > closeTeardownAt, 'DISPOSED is emitted only after close awaits teardown');
const recoveryCloseAt = closeBody.indexOf('if (this.recoveryDisposePromise)');
const recoveryAwaitAt = closeBody.indexOf('await this.recoveryDisposePromise', recoveryCloseAt);
const recoveryCameraReleasedAt = closeBody.indexOf('this.lifecycle.cameraLeaseReleased()', recoveryAwaitAt);
const recoveryDisposedAt = closeBody.indexOf('this.lifecycle.disposed()', recoveryCameraReleasedAt);
assert.ok(recoveryCloseAt >= 0 && recoveryAwaitAt > recoveryCloseAt, 'closing during recovery waits for recovery teardown');
assert.ok(recoveryCameraReleasedAt > recoveryAwaitAt && recoveryDisposedAt > recoveryCameraReleasedAt, 'recovery-time close publishes terminal milestones only after teardown');


const releaseAt = teardownBody.indexOf('lease?.release()');
const cameraLeaseEventAt = teardownBody.indexOf('this.lifecycle.cameraLeaseReleased()', releaseAt);
const decoderDisposeAt = teardownBody.indexOf('await decoder.dispose()', cameraLeaseEventAt);
assert.ok(releaseAt >= 0 && cameraLeaseEventAt > releaseAt, 'CAMERA_LEASE_RELEASED follows lease release');

assert.ok(decoderDisposeAt > cameraLeaseEventAt, 'decoder disposal may continue after CAMERA_RELEASED');

// Foreground recovery retires the old platform session without signaling a
// feature exit; teardown completes before the session becomes unavailable.
const recoveryDisposeStart = sessionSource.indexOf('  disposeForRecovery(): Promise<void> {');
const recoveryDisposeEnd = sessionSource.indexOf('  close(): Promise<void> {', recoveryDisposeStart);
assert.ok(recoveryDisposeStart >= 0 && recoveryDisposeEnd > recoveryDisposeStart, 'recovery-only disposal exists');
const recoveryDisposeBody = sessionSource.slice(recoveryDisposeStart, recoveryDisposeEnd);
assert.ok(recoveryDisposeBody.includes('await this.suspendPromise;') && recoveryDisposeBody.includes('await this.teardown(true);'), 'recovery disposal waits for suspension and resource teardown');
assert.ok(recoveryDisposeBody.indexOf('await this.teardown(true);') < recoveryDisposeBody.indexOf('this.disposed = true;'), 'session is retired only after resources are released');
assert.doesNotMatch(recoveryDisposeBody, /sessionCloseStarted|cameraLeaseReleased|exitPresentation/, 'recovery disposal must not trigger feature exit milestones');

assert.doesNotMatch(sessionSource, /notifyExitPresentation|exitPresentation|EXIT_PRESENTATION/, 'session cannot receive or publish presentation completion');

const contractSource = await readFile(
  new URL('../src/platform/scanner/contracts.ts', import.meta.url),
  'utf8',
);
assert.ok(contractSource.includes('lifecycleObserver?: ScannerLifecycleObserver;'), 'platform contract accepts observer, not a feature-created adapter');
assert.doesNotMatch(contractSource, /notifyExitPresentation|EXIT_PRESENTATION/, 'platform contract excludes presentation milestones');
assert.ok(contractSource.includes('disposeForRecovery(): Promise<void>;'), 'session contract exposes recovery-only retirement');

const homeScannerSource = await readFile(
  new URL('../src/features/scanner/components/BarcodeScanner.tsx', import.meta.url),
  'utf8',
);
assert.ok(homeScannerSource.includes('lifecycleObserver: handleLifecycleEvent'), 'Home subscribes to engine lifecycle');
assert.ok(!homeScannerSource.includes('notifyExitPresentation'), 'Home does not report presentation to the engine');
assert.ok(homeScannerSource.includes('milestones.presentation && milestones.cameraLeaseReleased && milestones.disposed'), 'Home locally joins presentation with camera lease release and disposal');
assert.ok(homeScannerSource.includes('milestones.cameraLeaseReleased && milestones.disposed'), 'animation-first completion waits for resource teardown');
assert.ok(homeScannerSource.includes('captureScannerPreviewFrame(scanner.videoRef.current)'), 'Home preserves the pre-teardown visual snapshot');

assert.ok(hookSource.includes('new ScannerPageLifecycleCoordinator('), 'shared scanner hook must route page lifecycle through one coordinator');
assert.ok(hookSource.includes('pendingLeaseRequest?.cancel();'), 'background and unmount must cancel an unclaimed tap-started camera lease');
assert.ok(hookSource.includes('coordinator.transition(false)') && hookSource.includes('coordinator.transition(visible)'), 'visibility and pagehide signals must use the serialized coordinator');
assert.ok(!hookSource.includes('recoveryAttemptsRef'), 'foreground recovery must not be blocked by a fixed lifetime attempt counter');
assert.ok(hookSource.includes('disposeForRecovery()'), 'foreground recovery must retire the old platform session');
assert.ok(hookSource.includes('replaceVideoSurface()'), 'foreground recovery must request a fresh video surface');
assert.ok(hookSource.includes('pending.resolve(videoRef.current)'), 'recovery waits for the replacement video node to commit');
assert.ok(hookSource.includes('sessionRef.current !== session'), 'callbacks from retired sessions must not update the active feature');
assert.ok(hookSource.includes('sessionRef.current ?? recoveryRetiredSessionRef.current'), 'a feature can still close cleanly while recovery has detached the previous session');
assert.doesNotMatch(hookSource, /lifecycleSessionRef|notifyExitPresentation|EXIT_PRESENTATION/, 'the hook has no presentation-owned session retention');
assert.ok(hookSource.includes('if (recoveryRequiredRef.current) await recoverScanner();'), 'foreground lifecycle uses recovery only after a background transition');
assert.ok(hookSource.includes('Keep the old start promise registered until its in-flight camera lease') && hookSource.includes('Recovery waits for it before acquiring a new lease.'), 'recovery serializes an in-flight lease handoff before opening the next session');

const homeSurfaceSource = await readFile(
  new URL('../src/features/scanner/components/BarcodeScanner.tsx', import.meta.url),
  'utf8',
);
const stocktakeSurfaceSource = await readFile(
  new URL('../src/features/stocktake/components/StocktakeScanner.tsx', import.meta.url),
  'utf8',
);
assert.ok(homeSurfaceSource.includes('<video key={scanner.videoSurfaceKey} ref={scanner.videoRef}'), 'Home binds the shared engine surface key to its video element');
assert.ok(stocktakeSurfaceSource.includes('<video key={scanner.videoSurfaceKey} ref={scanner.videoRef}'), 'Stocktake binds the shared engine surface key to its video element');


// Browser page lifecycle signals (visibilitychange/pagehide/pageshow) must be
// coalesced and serialized so resume never races an unfinished suspension.
const pageLifecycleSource = await readFile(
  new URL('../src/platform/scanner/scannerPageLifecycleCoordinator.ts', import.meta.url),
  'utf8',
);
const pageLifecycleCompiled = ts.transpileModule(pageLifecycleSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const pageLifecycleUrl = 'data:text/javascript;base64,' + Buffer.from(pageLifecycleCompiled).toString('base64');
const { ScannerPageLifecycleCoordinator } = await import(pageLifecycleUrl);

const pageLifecycleEvents = [];
let releaseBackgroundTransition;
const backgroundGate = new Promise((resolve) => { releaseBackgroundTransition = resolve; });
const pageLifecycleCoordinator = new ScannerPageLifecycleCoordinator(
  true,
  async () => {
    pageLifecycleEvents.push('background:start');
    await backgroundGate;
    pageLifecycleEvents.push('background:end');
  },
  async () => { pageLifecycleEvents.push('foreground'); },
);

const backgroundTransition = pageLifecycleCoordinator.transition(false);
const foregroundTransition = pageLifecycleCoordinator.transition(true);
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(
  pageLifecycleEvents,
  ['background:start'],
  'foreground resume must wait until background suspension completes',
);
releaseBackgroundTransition();
await Promise.all([backgroundTransition, foregroundTransition]);
assert.deepEqual(
  pageLifecycleEvents,
  ['background:start', 'background:end', 'foreground'],
  'background and foreground transitions must execute in deterministic order',
);

// Duplicate signals from visibilitychange + pagehide/pageshow are coalesced.
await pageLifecycleCoordinator.transition(true);
assert.equal(pageLifecycleEvents.length, 3, 'duplicate foreground signals must not start a second resume');
await pageLifecycleCoordinator.transition(false);
await pageLifecycleCoordinator.transition(false);
assert.deepEqual(
  pageLifecycleEvents.slice(3),
  ['background:start', 'background:end'],
  'duplicate background signals must not suspend twice',
);

// BFCache pageshow may force a foreground reconciliation without a visibility edge.
await pageLifecycleCoordinator.transition(true, true);
assert.equal(pageLifecycleEvents.at(-1), 'foreground', 'forced pageshow reconciliation must resume a non-scanning session');
pageLifecycleCoordinator.dispose();
await pageLifecycleCoordinator.transition(false, true);
assert.equal(pageLifecycleEvents.at(-1), 'foreground', 'disposed coordinators must ignore late browser events');


// Stocktake C2: the feature owns presentation completion locally while the
// shared session emits only technical close, lease-release and disposal events.
const stocktakeGateSource = await readFile(
  new URL('../src/features/stocktake/services/stocktakeScannerExitGate.ts', import.meta.url),
  'utf8',
);
const stocktakeGateCompiled = ts.transpileModule(stocktakeGateSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const stocktakeGateUrl = 'data:text/javascript;base64,' + Buffer.from(stocktakeGateCompiled).toString('base64');
const { StocktakeScannerExitGate } = await import(stocktakeGateUrl);

const permutations = (items) => items.length === 0
  ? [[]]
  : items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map((tail) => [item, ...tail]));
for (const order of permutations(['SESSION_CLOSE_STARTED', 'CAMERA_LEASE_RELEASED', 'DISPOSED', 'PRESENTATION'])) {
  let closeCount = 0;
  const gate = new StocktakeScannerExitGate(() => { closeCount += 1; });
  for (const milestone of order) {
    if (milestone === 'PRESENTATION') gate.completePresentation();
    else gate.observe(milestone);
    assert.ok(closeCount <= 1, 'Stocktake close gate must never complete more than once');
  }
  assert.equal(closeCount, 1, `all four milestones must complete in any order: ${order.join(' → ')}`);
  gate.completePresentation();
  gate.observe('SESSION_CLOSE_STARTED');
  gate.observe('CAMERA_LEASE_RELEASED');
  gate.observe('DISPOSED');
  assert.equal(closeCount, 1, 'duplicate milestones and animation completion must not close twice');
}
let incompleteCloseCount = 0;
const incompleteGate = new StocktakeScannerExitGate(() => { incompleteCloseCount += 1; });
incompleteGate.completePresentation();
incompleteGate.observe('SESSION_CLOSE_STARTED');
incompleteGate.observe('CAMERA_LEASE_RELEASED');
assert.equal(incompleteCloseCount, 0, 'presentation and animation alone cannot close before DISPOSED');
incompleteGate.observe('DISPOSED');
assert.equal(incompleteCloseCount, 1, 'last missing lifecycle milestone completes the close gate');

const stocktakeScannerSource = await readFile(
  new URL('../src/features/stocktake/components/StocktakeScanner.tsx', import.meta.url),
  'utf8',
);
assert.ok(stocktakeScannerSource.includes('lifecycleObserver: handleLifecycleEvent'), 'Stocktake subscribes to the shared engine lifecycle');
assert.ok(stocktakeScannerSource.includes('new StocktakeScannerExitGate(() => onCloseRef.current())'), 'Stocktake keeps the latest parent callback behind an idempotent gate');
assert.ok(!stocktakeScannerSource.includes('ScannerLifecycleAdapter'), 'Stocktake must not construct its own lifecycle adapter');
const matchingAnimationCheck = stocktakeScannerSource.indexOf("event.animationName !== 'scanner-stocktake-close'");
const gatePresentationAt = stocktakeScannerSource.indexOf('exitGateRef.current?.completePresentation();', matchingAnimationCheck);
assert.ok(matchingAnimationCheck >= 0 && gatePresentationAt > matchingAnimationCheck,
  'Stocktake completes its local presentation gate only after its matching close animation');
assert.doesNotMatch(stocktakeScannerSource, /notifyExitPresentation|EXIT_PRESENTATION/, 'Stocktake never sends presentation completion to the engine');
const manualCloseStart = stocktakeScannerSource.indexOf('  const close = () => {');
const manualSnapshotAt = stocktakeScannerSource.indexOf('captureScannerPreviewFrame(scanner.videoRef.current)', manualCloseStart);
const manualCloseCallAt = stocktakeScannerSource.indexOf('void scanner.closeScanner();', manualCloseStart);
assert.ok(manualSnapshotAt >= 0 && manualCloseCallAt > manualSnapshotAt, 'manual close snapshots the preview before teardown');
const resultHandlerStart = stocktakeScannerSource.indexOf('  const scanner = useScannerEngine(');
const resultHandlerEnd = stocktakeScannerSource.indexOf("}, mode: 'single'", resultHandlerStart);
const resultHandler = stocktakeScannerSource.slice(resultHandlerStart, resultHandlerEnd);
assert.ok(resultHandler.indexOf('captureScannerPreviewFrame(scanner.videoRef.current)') < resultHandler.indexOf('onDetected(value)'),
  'successful scan snapshots the preview before forwarding the result');
assert.ok(!resultHandler.includes('closeScanner()'), 'single-result auto-close must not be duplicated by the feature');
assert.ok(stocktakeScannerSource.includes('if (event.target !== event.currentTarget'), 'nested animation events are ignored');

const stocktakeModuleSource = await readFile(
  new URL('../src/features/stocktake/components/StocktakeModule.tsx', import.meta.url),
  'utf8',
);
assert.ok(stocktakeModuleSource.includes('setBarcode(value.trim())') && stocktakeModuleSource.includes("setQuantity('1')") && stocktakeModuleSource.includes('setManualEntry(false)'),
  'barcode-to-form fill and quantity defaults remain unchanged');
assert.ok(stocktakeModuleSource.includes('const saveEntry = async () =>') && stocktakeModuleSource.includes('stocktakeStore.putEntry(entry)'),
  'Stocktake persistence remains behind the explicit save action');
assert.ok(stocktakeModuleSource.includes("source: manualEntry ? 'manual' : 'scan'") && stocktakeModuleSource.includes('sequence: zoneEntries.reduce'),
  'manual entry and duplicate-row sequence behavior remain intact');
assert.ok(stocktakeModuleSource.includes('Barcode trùng nhau được giữ nguyên thành các dòng riêng'),
  'review continues to preserve duplicate barcode rows');

const stocktakeTransitionCss = await readFile(
  new URL('../src/features/scanner/scanner-transition.css', import.meta.url),
  'utf8',
);
assert.match(stocktakeTransitionCss, /scanner-stocktake-close 1ms linear both/,
  'reduced-motion Stocktake exit must still dispatch animationend');

console.log('Scanner lifecycle contract, teardown-order and Stocktake C2 exit-gate tests passed.');
