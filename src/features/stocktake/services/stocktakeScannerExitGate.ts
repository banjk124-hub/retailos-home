import type { ScannerLifecycleEventName } from '../../../platform/scanner/contracts';

type ExitMilestones = {
  closeStarted: boolean;
  cameraLeaseReleased: boolean;
  disposed: boolean;
  presentation: boolean;
  completed: boolean;
};

/**
 * Feature-owned completion gate. Resource teardown remains in the shared
 * scanner session; this class only joins its terminal milestones with UI exit.
 */
export class StocktakeScannerExitGate {
  private readonly milestones: ExitMilestones = {
    closeStarted: false,
    cameraLeaseReleased: false,
    disposed: false,
    presentation: false,
    completed: false,
  };

  constructor(private readonly onComplete: () => void) {}

  observe(type: ScannerLifecycleEventName): void {
    if (type === 'SESSION_CLOSE_STARTED') this.milestones.closeStarted = true;
    if (type === 'CAMERA_LEASE_RELEASED') this.milestones.cameraLeaseReleased = true;
    if (type === 'DISPOSED') this.milestones.disposed = true;
    this.tryComplete();
  }

  completePresentation(): void {
    this.milestones.presentation = true;
    this.tryComplete();
  }

  private tryComplete(): void {
    const { closeStarted, cameraLeaseReleased, disposed, presentation, completed } = this.milestones;
    if (!closeStarted || !cameraLeaseReleased || !disposed || !presentation || completed) return;
    this.milestones.completed = true;
    this.onComplete();
  }
}
