import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controllerSource = await readFile(new URL('../src/platform/scanner/scannerCameraHealthController.ts', import.meta.url), 'utf8');
const controllerUrl = 'data:text/javascript;base64,' + Buffer.from(controllerSource).toString('base64');
const controller = await import(controllerUrl);
const {
  ScannerCameraHealthController,
  CAMERA_HEALTH_STALL_TIMEOUT_MS,
  CAMERA_HEALTH_WATCHDOG_INTERVAL_MS,
  CAMERA_HEALTH_RECOVERY_COOLDOWN_MS,
  CAMERA_HEALTH_MAX_AUTO_RECOVERY_ATTEMPTS,
} = controller;

assert.equal(CAMERA_HEALTH_STALL_TIMEOUT_MS, 3000);
assert.equal(CAMERA_HEALTH_WATCHDOG_INTERVAL_MS, 1000);
assert.equal(CAMERA_HEALTH_RECOVERY_COOLDOWN_MS, 10000);
assert.equal(CAMERA_HEALTH_MAX_AUTO_RECOVERY_ATTEMPTS, 1);

const events = [];
const recoveryRequests = [];
const health = new ScannerCameraHealthController(
  (snapshot) => events.push(snapshot),
  (snapshot) => recoveryRequests.push(snapshot),
);
health.start(1000);
assert.equal(health.getSnapshot(1000).state, 'healthy');

health.trackMuted(1200);
assert.equal(health.getSnapshot(1200).state, 'degraded', 'mute is a degraded signal, not immediate fatal error');
health.frame(1500);
assert.equal(health.getSnapshot(1500).state, 'healthy', 'frame progression restores health after mute');

health.tick(4499);
assert.equal(health.getSnapshot(4499).state, 'healthy', 'watchdog does not trigger before stall threshold');
health.tick(4500);
assert.equal(health.getSnapshot(4500).state, 'recovering', 'stale frame progress requests bounded recovery');
assert.equal(recoveryRequests.length, 1);
assert.equal(recoveryRequests[0].reason, 'recovery-started');
assert.equal(recoveryRequests[0].recoveryAttempts, 1);

health.completeRecovery(true, 4600);
assert.equal(health.getSnapshot(4600).state, 'healthy', 'successful reacquisition resets live health state');
health.tick(7599);
assert.equal(health.getSnapshot(7599).state, 'healthy');
health.tick(7600);
assert.equal(health.getSnapshot(7600).state, 'failed', 'second stall is escalated after the single automatic attempt is consumed');
assert.equal(health.getSnapshot(7600).recoveryAttempts, 1);
assert.equal(health.getSnapshot(7600).reason, 'recovery-cooldown', 'cooldown is enforced separately from the retry budget');
health.dispose();
health.tick(9000);
assert.equal(health.getSnapshot(9000).state, 'failed', 'disposed controller ignores later ticks');

const budgetHealth = new ScannerCameraHealthController(() => undefined, () => undefined);
budgetHealth.start(100);
budgetHealth.tick(3100);
budgetHealth.completeRecovery(true, 3200);
budgetHealth.frame(14000);
budgetHealth.tick(17000);
assert.equal(budgetHealth.getSnapshot(17000).state, 'failed');
assert.equal(budgetHealth.getSnapshot(17000).reason, 'recovery-budget-exhausted', 'attempt budget is enforced after the cooldown window has elapsed');
budgetHealth.dispose();

const endedEvents = [];
const endedRecovery = [];
const endedHealth = new ScannerCameraHealthController(
  (snapshot) => endedEvents.push(snapshot),
  (snapshot) => endedRecovery.push(snapshot),
);
endedHealth.start(50);
endedHealth.trackEnded(100);
assert.equal(endedHealth.getSnapshot(100).state, 'recovering', 'track-ended signal requests immediate recovery');
assert.equal(endedRecovery.length, 1);
endedHealth.completeRecovery(false, 200);
assert.equal(endedHealth.getSnapshot(200).state, 'failed', 'failed recovery is terminal and bounded');

const sessionSource = await readFile(new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url), 'utf8');
assert.match(sessionSource, /startCameraHealthWatchdog\(generation\)/, 'watchdog is started after the camera reaches scanning state');
assert.match(sessionSource, /clearCameraHealthWatchdog\(\)/, 'watchdog is cleared on teardown');
assert.match(sessionSource, /requestVideoFrameCallback/, 'native video-frame callback is used when supported');
assert.match(sessionSource, /this\.cameraHealth\.frame\(healthNow\)/, 'health heartbeat is tied to frame progress');
assert.match(sessionSource, /this\.video\.currentTime > this\.lastHealthVideoTime \+ 0\.005/, 'RAF fallback requires media timeline advancement');
assert.match(sessionSource, /this\.cameraHealth\.trackMuted/, 'mute signal degrades camera health');
assert.match(sessionSource, /this\.cameraHealth\.trackUnmuted/, 'unmute signal is observed');
assert.match(sessionSource, /this\.cameraHealth\.trackEnded/, 'track-ended signal enters recovery controller');
assert.match(sessionSource, /this\.cameraHealth\.completeRecovery\(success, performance\.now\(\)\)/, 'recovery result is fed back to the controller');

const hookSource = await readFile(new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url), 'utf8');
assert.match(hookSource, /automaticHealthRecoveryAttemptsRef\.current >= 1/, 'hook limits automatic recovery across session replacement to one attempt');
assert.match(hookSource, /automaticHealthRecoveryAttemptsRef\.current \+= 1/, 'auto-recovery budget is consumed before attempting recovery');
assert.match(hookSource, /healthRecoveryHandlerRef\.current = async/, 'recovery is routed through the existing serialized session replacement path');
assert.match(hookSource, /return sessionRef\.current\?\.state === 'scanning'/, 'recovery is considered successful only when replacement session reaches scanning');

console.log('Scanner SC-02 camera health, watchdog, bounded recovery and escalation tests passed.');
