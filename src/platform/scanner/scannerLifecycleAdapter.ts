import type { ScannerLifecycleEventName, ScannerLifecycleObserver } from './contracts';

/**
 * Adapts engine-owned technical milestones to an optional feature observer.
 * It does not own feature presentation, animation, React UI, or navigation.
 *
 * OPENING/READY/SCANNING may recur after suspend/resume. Terminal technical
 * milestones are emitted at most once per adapter/session. READY and SCANNING
 * are optional when a session closes before reaching those milestones.
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
  sessionCloseStarted(): void { this.publish('SESSION_CLOSE_STARTED'); }
  cameraLeaseReleased(): void { this.publish('CAMERA_LEASE_RELEASED'); }
  disposed(): void { this.publish('DISPOSED'); }

  private publish(type: ScannerLifecycleEventName): void {
    const terminal = type === 'SESSION_CLOSE_STARTED'
      || type === 'CAMERA_LEASE_RELEASED' || type === 'DISPOSED';
    if (terminal && this.emitted.has(type)) return;
    if (terminal) this.emitted.add(type);
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
