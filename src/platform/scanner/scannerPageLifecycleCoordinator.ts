/**
 * Serializes browser page lifecycle signals for one mounted scanner.
 *
 * visibilitychange is the primary signal. pagehide/pageshow are additional
 * signals (notably for Safari/BFCache); repeated signals for the same visibility
 * edge are coalesced. Real transitions are always processed in order so a
 * foreground resume cannot race an unfinished background suspension.
 */
export class ScannerPageLifecycleCoordinator {
  private visible: boolean;
  private disposed = false;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    initiallyVisible: boolean,
    private readonly onBackground: () => void | Promise<void>,
    private readonly onForeground: () => void | Promise<void>,
  ) {
    this.visible = initiallyVisible;
  }

  transition(visible: boolean, force = false): Promise<void> {
    if (this.disposed) return this.queue;
    if (!force && this.visible === visible) return this.queue;

    this.visible = visible;
    const run = async () => {
      if (this.disposed) return;
      if (visible) await this.onForeground();
      else await this.onBackground();
    };

    // A failed transition must not poison later visibility changes.
    const next = this.queue.catch(() => undefined).then(run);
    this.queue = next;
    return next;
  }

  dispose(): void {
    this.disposed = true;
  }
}
