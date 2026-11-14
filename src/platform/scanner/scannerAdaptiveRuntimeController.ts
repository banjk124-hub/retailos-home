/**
 * A3 runtime budget controller.
 *
 * Observes completed decode cost and frame callback gaps. It only bounds
 * optional fallback candidates after the baseline/orientation path; it never
 * throttles frame delivery, changes camera settings, or disables T3 fallback.
 */
export type ScannerAdaptiveRuntimeMode = 'normal' | 'constrained';

export type ScannerAdaptiveRuntimeBudget = {
  schemaVersion: 1;
  mode: ScannerAdaptiveRuntimeMode;
  maxImageCandidates: 2 | 1;
  maxGeometryCandidates: 4 | 2;
  reasons: string[];
};

export const SCANNER_ADAPTIVE_RUNTIME_POLICY = {
  pressureDecodeMs: 110,
  pressureFrameGapMs: 220,
  pressureSamplesToConstrain: 3,
  recoveryDecodeMs: 75,
  recoveryFrameGapMs: 150,
  recoverySamplesToRestore: 8,
} as const;

export class ScannerAdaptiveRuntimeController {
  private mode: ScannerAdaptiveRuntimeMode = 'normal';
  private pressureStreak = 0;
  private recoveryStreak = 0;
  private lastTransitionReason = 'startup_full_budget';

  getBudget(): ScannerAdaptiveRuntimeBudget {
    return this.mode === 'normal'
      ? {
        schemaVersion: 1,
        mode: 'normal',
        maxImageCandidates: 2,
        maxGeometryCandidates: 4,
        reasons: [this.lastTransitionReason],
      }
      : {
        schemaVersion: 1,
        mode: 'constrained',
        maxImageCandidates: 1,
        maxGeometryCandidates: 2,
        reasons: [this.lastTransitionReason],
      };
  }

  observe(decodeDurationMs: number, frameGapMs: number): ScannerAdaptiveRuntimeBudget {
    if (!Number.isFinite(decodeDurationMs) || decodeDurationMs < 0
      || !Number.isFinite(frameGapMs) || frameGapMs < 0) return this.getBudget();

    const pressured = decodeDurationMs >= SCANNER_ADAPTIVE_RUNTIME_POLICY.pressureDecodeMs
      || frameGapMs >= SCANNER_ADAPTIVE_RUNTIME_POLICY.pressureFrameGapMs;
    const recovered = decodeDurationMs <= SCANNER_ADAPTIVE_RUNTIME_POLICY.recoveryDecodeMs
      && frameGapMs <= SCANNER_ADAPTIVE_RUNTIME_POLICY.recoveryFrameGapMs;

    if (this.mode === 'normal') {
      this.recoveryStreak = 0;
      this.pressureStreak = pressured ? this.pressureStreak + 1 : 0;
      if (this.pressureStreak >= SCANNER_ADAPTIVE_RUNTIME_POLICY.pressureSamplesToConstrain) {
        this.mode = 'constrained';
        this.pressureStreak = 0;
        this.lastTransitionReason = 'sustained_runtime_pressure';
      }
    } else {
      this.pressureStreak = 0;
      this.recoveryStreak = recovered ? this.recoveryStreak + 1 : 0;
      if (this.recoveryStreak >= SCANNER_ADAPTIVE_RUNTIME_POLICY.recoverySamplesToRestore) {
        this.mode = 'normal';
        this.recoveryStreak = 0;
        this.lastTransitionReason = 'sustained_runtime_recovery';
      }
    }
    return this.getBudget();
  }

  reset(): void {
    this.mode = 'normal';
    this.pressureStreak = 0;
    this.recoveryStreak = 0;
    this.lastTransitionReason = 'session_reset_full_budget';
  }
}
