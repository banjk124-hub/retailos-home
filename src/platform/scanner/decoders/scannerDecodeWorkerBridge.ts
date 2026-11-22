import type { ScannerSymbology } from '../contracts';

export type ScannerWorkerDecodeResult = Array<{
  text: string;
  format: string;
  isValid: boolean;
}>;

type WorkerReply =
  | { type: 'READY'; protocolVersion: 1; generation: number; wasmVersion?: string }
  | { type: 'RESULT'; protocolVersion: 1; generation: number; jobId: number; results: ScannerWorkerDecodeResult; stale?: boolean }
  | { type: 'ERROR'; protocolVersion: 1; generation: number; jobId?: number; phase?: string; error: string }
  | { type: 'DISPOSED'; protocolVersion: 1; generation: number };

type PendingFrame = {
  jobId: number;
  frame: ImageData;
  resolve: (results: ScannerWorkerDecodeResult) => void;
};

const PROTOCOL_VERSION = 1;

/**
 * SC-01A isolated Worker bridge prototype.
 * It deliberately is not wired into UniversalScannerSession yet.
 * Worker owns only the decode workload; camera/session/ROI policy stays on Main Thread.
 */
export class ScannerDecodeWorkerBridge {
  private worker: Worker | null = null;
  private generation = 0;
  private nextJobId = 0;
  private ready = false;
  private disposed = false;
  private inFlight: PendingFrame | null = null;
  private latestPending: PendingFrame | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private initResolve: (() => void) | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;

  async initialize(formats: ScannerSymbology[]): Promise<void> {
    if (this.disposed) throw new Error('Scanner worker bridge is disposed.');
    if (this.worker) throw new Error('Scanner worker bridge already initialized.');
    const generation = ++this.generation;
    const worker = new Worker(new URL('./scannerDecodeWorker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    const ready = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => this.onMessage(event.data);
    worker.onerror = (event) => {
      this.fail(new Error(event.message || 'Scanner Worker crashed.'));
    };
    worker.onmessageerror = () => this.fail(new Error('Scanner Worker message could not be decoded.'));
    worker.postMessage({ type: 'INIT', protocolVersion: PROTOCOL_VERSION, generation, formats });
    this.initTimeout = setTimeout(() => this.fail(new Error('Scanner Worker initialization timed out.')), 10_000);
    await ready;
  }

  decode(frame: ImageData): Promise<ScannerWorkerDecodeResult> {
    if (this.disposed || !this.ready || !this.worker) return Promise.reject(new Error('Scanner Worker is not ready.'));
    if (!Number.isSafeInteger(frame.width) || !Number.isSafeInteger(frame.height)
      || frame.width < 1 || frame.height < 1 || frame.width * frame.height > 1_500_000
      || frame.data.length !== frame.width * frame.height * 4) {
      return Promise.reject(new Error('Invalid or oversized frame for Worker decode.'));
    }
    const jobId = ++this.nextJobId;
    return new Promise((resolve) => {
      const next: PendingFrame = { jobId, frame, resolve };
      if (!this.inFlight) {
        this.send(next);
        return;
      }
      // Latest-frame-wins: drop the older pending frame, never build a FIFO backlog.
      this.latestPending?.resolve([]);
      this.latestPending = next;
    });
  }

  cancelCurrent(): void {
    if (!this.worker || !this.inFlight) return;
    this.worker.postMessage({ type: 'CANCEL', protocolVersion: PROTOCOL_VERSION, generation: this.generation, jobId: this.inFlight.jobId });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    if (this.initTimeout) clearTimeout(this.initTimeout);
    this.initTimeout = null;
    this.initReject?.(new Error('Scanner Worker bridge disposed during initialization.'));
    this.initReject = null;
    this.initResolve = null;
    this.inFlight?.resolve([]);
    this.latestPending?.resolve([]);
    this.inFlight = null;
    this.latestPending = null;
    if (this.worker) {
      this.worker.postMessage({ type: 'DISPOSE', protocolVersion: PROTOCOL_VERSION, generation: this.generation });
      this.worker.terminate();
      this.worker = null;
    }
  }

  private send(frame: PendingFrame): void {
    const worker = this.worker;
    if (!worker || this.disposed) {
      frame.resolve([]);
      return;
    }
    this.inFlight = frame;
    // Copy because transferring the buffer must not detach the caller's ImageData.
    const pixels = new Uint8ClampedArray(frame.frame.data).buffer;
    worker.postMessage({
      type: 'DECODE',
      protocolVersion: PROTOCOL_VERSION,
      generation: this.generation,
      jobId: frame.jobId,
      width: frame.frame.width,
      height: frame.frame.height,
      pixels,
    }, [pixels]);
  }

  private finishFrame(jobId: number, results: ScannerWorkerDecodeResult): void {
    if (this.inFlight?.jobId !== jobId) return;
    const finished = this.inFlight;
    this.inFlight = null;
    finished.resolve(results);
    if (this.latestPending) {
      const next = this.latestPending;
      this.latestPending = null;
      this.send(next);
    }
  }

  private onMessage(message: WorkerReply): void {
    if (!message || message.protocolVersion !== PROTOCOL_VERSION || message.generation !== this.generation) return;
    if (message.type === 'READY') {
      if (this.initTimeout) clearTimeout(this.initTimeout);
      this.initTimeout = null;
      this.ready = true;
      this.initResolve?.();
      this.initResolve = null;
      this.initReject = null;
      return;
    }
    if (message.type === 'ERROR') {
      const error = new Error(message.error || 'Scanner Worker error.');
      if (message.phase === 'init' || message.jobId === undefined) {
        this.fail(error);
      } else {
        // Frame-level decode errors fail only that frame, not the Worker lifecycle.
        this.finishFrame(message.jobId, []);
      }
      return;
    }
    if (message.type === 'RESULT') {
      this.finishFrame(message.jobId, message.stale ? [] : message.results);
    }
  }

  private fail(error: Error): void {
    if (this.initTimeout) clearTimeout(this.initTimeout);
    this.initTimeout = null;
    this.ready = false;
    this.initReject?.(error);
    this.initReject = null;
    this.initResolve = null;
    this.inFlight?.resolve([]);
    this.latestPending?.resolve([]);
    this.inFlight = null;
    this.latestPending = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
