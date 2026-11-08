import type { ScannerLifecycleEventName } from '../../../platform/scanner/contracts';

type ExitMilestones = {
  exitRequested: boolean;
  cameraReleased: boolean;
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
    exitRequested: false,
    cameraReleased: false,
    disposed: false,
    presentation: false,
    completed: false,
  };

  constructor(private readonly onComplete: () => void) {}

  observe(type: ScannerLifecycleEventName): void {
    if (type === 'EXIT_REQUESTED') this.milestones.exitRequested = true;
    if (type === 'CAMERA_RELEASED') this.milestones.cameraReleased = true;
    if (type === 'DISPOSED') this.milestones.disposed = true;
    this.tryComplete();
  }

  completePresentation(): void {
    this.milestones.presentation = true;
    this.tryComplete();
  }

  private tryComplete(): void {
    const { exitRequested, cameraReleased, disposed, presentation, completed } = this.milestones;
    if (!exitRequested || !cameraReleased || !disposed || !presentation || completed) return;
    this.milestones.completed = true;
    this.onComplete();
  }
}
