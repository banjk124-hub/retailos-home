import type { ScannerLifecycleEventName, ScannerLifecycleObserver } from './contracts';

/**
 * Adapts engine-owned milestones to an optional, feature-consumable lifecycle
 * event stream. It does not own camera, decoder, React, or presentation work.
 *
 * OPENING/READY/SCANNING may recur after suspend/resume. Terminal milestones
 * are emitted at most once per adapter/session. READY and SCANNING are optional
 * when a session is closed before reaching those milestones.
 */
export class ScannerLifecycleAdapter {
  private readonly emitted = new Set<ScannerLifecycleEventName>();

  constructor(
    private readonly sessionId: string,
    private readonly observer?: ScannerLifecycleObserver,
  ) {}

  opening(): void { this.publish('OPENING'); }
  ready(): void { this.publish('READY'); }
  scanning(): void { this.publish('SCANNING'); }
  exitRequested(): void { this.publish('EXIT_REQUESTED'); }
  cameraReleased(): void { this.publish('CAMERA_RELEASED'); }
  exitPresentation(): void { this.publish('EXIT_PRESENTATION'); }
  disposed(): void { this.publish('DISPOSED'); }

  private publish(type: ScannerLifecycleEventName): void {
    if (this.emitted.has(type)) return;
    this.emitted.add(type);
    if (!this.observer) return;

    try {
      this.observer({
        type,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Observability must never interfere with camera or decoder cleanup.
      console.warn('[RetailOS Scanner] Lifecycle observer failed', {
        type,
        sessionId: this.sessionId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
}
