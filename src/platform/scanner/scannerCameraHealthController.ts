export type ScannerCameraHealthState = 'healthy' | 'degraded' | 'stalled' | 'recovering' | 'failed';
export type ScannerCameraHealthReason = 'frame-progress' | 'track-muted' | 'track-unmuted' | 'frame-stall' | 'track-ended' | 'recovery-started' | 'recovery-succeeded' | 'recovery-failed' | 'recovery-budget-exhausted';
export type ScannerCameraHealthSnapshot = {
  state: ScannerCameraHealthState;
  reason: ScannerCameraHealthReason;
  frameAgeMs: number;
  recoveryAttempts: number;
};
export const CAMERA_HEALTH_STALL_TIMEOUT_MS = 3_000;
export const CAMERA_HEALTH_WATCHDOG_INTERVAL_MS = 1_000;
export const CAMERA_HEALTH_RECOVERY_COOLDOWN_MS = 10_000;
export const CAMERA_HEALTH_MAX_AUTO_RECOVERY_ATTEMPTS = 1;

/** Bounded health-state controller. It observes frame progress and never owns camera resources. */
export class ScannerCameraHealthController {
  private state: ScannerCameraHealthState = 'healthy';
  private reason: ScannerCameraHealthReason = 'frame-progress';
  private lastFrameAt = 0;
  private lastRecoveryAt = -Infinity;
  private recoveryAttempts = 0;
  private started = false;
  private muted = false;
  private disposed = false;

  constructor(
    private readonly onChange: (snapshot: ScannerCameraHealthSnapshot) => void,
    private readonly onRecoveryRequest: (snapshot: ScannerCameraHealthSnapshot) => void,
  ) {}

  start(now: number): void {
    if (this.disposed) return;
    this.started = true;
    this.lastFrameAt = now;
    this.transition('healthy', 'frame-progress', now);
  }

  frame(now: number): void {
    if (this.disposed || !this.started || this.state === 'recovering' || this.state === 'failed') return;
    this.lastFrameAt = now;
    this.transition(this.muted ? 'degraded' : 'healthy', 'frame-progress', now);
  }

  trackMuted(now: number): void {
    if (this.disposed || this.state === 'recovering' || this.state === 'failed') return;
    this.muted = true;
    this.transition('degraded', 'track-muted', now);
  }

  trackUnmuted(now: number): void {
    if (this.disposed || this.state === 'recovering' || this.state === 'failed') return;
    this.muted = false;
    this.transition(this.lastFrameAt > 0 && now - this.lastFrameAt < CAMERA_HEALTH_STALL_TIMEOUT_MS ? 'healthy' : 'degraded', 'track-unmuted', now);
  }

  tick(now: number): void {
    if (this.disposed || !this.started || this.state === 'recovering' || this.state === 'failed') return;
    if (now - this.lastFrameAt >= CAMERA_HEALTH_STALL_TIMEOUT_MS) {
      this.requestRecovery('frame-stall', now);
    }
  }

  trackEnded(now: number): void {
    if (this.disposed || this.state === 'recovering' || this.state === 'failed') return;
    this.requestRecovery('track-ended', now);
  }

  completeRecovery(success: boolean, now: number): void {
    if (this.disposed || this.state !== 'recovering') return;
    if (success) {
      this.muted = false;
      this.lastFrameAt = now;
      this.transition('healthy', 'recovery-succeeded', now);
    } else {
      this.transition('failed', 'recovery-failed', now);
    }
  }

  dispose(): void { this.disposed = true; }

  getSnapshot(now: number): ScannerCameraHealthSnapshot {
    return { state: this.state, reason: this.reason, frameAgeMs: Math.max(0, now - this.lastFrameAt), recoveryAttempts: this.recoveryAttempts };
  }

  private requestRecovery(reason: 'frame-stall' | 'track-ended', now: number): void {
    this.transition('stalled', reason, now);
    if (this.recoveryAttempts >= CAMERA_HEALTH_MAX_AUTO_RECOVERY_ATTEMPTS
      || now - this.lastRecoveryAt < CAMERA_HEALTH_RECOVERY_COOLDOWN_MS) {
      this.transition('failed', 'recovery-budget-exhausted', now);
      return;
    }
    this.recoveryAttempts += 1;
    this.lastRecoveryAt = now;
    this.transition('recovering', 'recovery-started', now);
    this.onRecoveryRequest(this.getSnapshot(now));
  }

  private transition(state: ScannerCameraHealthState, reason: ScannerCameraHealthReason, now: number): void {
    if (this.state === state && this.reason === reason) return;
    this.state = state;
    this.reason = reason;
    this.onChange(this.getSnapshot(now));
  }
}
