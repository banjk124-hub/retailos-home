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

type WorkerCommand =
  | { type: 'INIT'; protocolVersion: 1; generation: number; formats: ScannerSymbology[] }
  | { type: 'DECODE'; protocolVersion: 1; generation: number; jobId: number; width: number; height: number; pixels: ArrayBuffer }
  | { type: 'CANCEL'; protocolVersion: 1; generation: number; jobId: number }
  | { type: 'DISPOSE'; protocolVersion: 1; generation: number };

type PendingFrame = {
  jobId: number;
  frame: ImageData;
  resolve: (results: ScannerWorkerDecodeResult) => void;
  timeout: ReturnType<typeof setTimeout> | null;
};

export type ScannerWorkerErrorPhase = 'init' | 'decode' | 'runtime' | 'protocol' | 'dispose';
export type ScannerWorkerErrorCode = 'INIT_TIMEOUT' | 'DECODE_TIMEOUT' | 'WORKER_CRASH' | 'MESSAGE_ERROR' | 'PROTOCOL_ERROR' | 'INIT_FAILED' | 'DISPOSED';

export class ScannerWorkerRuntimeError extends Error {
  readonly phase: ScannerWorkerErrorPhase;
  readonly code: ScannerWorkerErrorCode;
  readonly generation: number;
  readonly recoverable: boolean;

  constructor(message: string, options: { phase: ScannerWorkerErrorPhase; code: ScannerWorkerErrorCode; generation: number; recoverable?: boolean }) {
    super(message);
    this.name = 'ScannerWorkerRuntimeError';
    this.phase = options.phase;
    this.code = options.code;
    this.generation = options.generation;
    this.recoverable = options.recoverable ?? false;
  }
}

const PROTOCOL_VERSION = 1;
const INIT_TIMEOUT_MS = 10_000;
const DECODE_TIMEOUT_MS = 5_000;
const MAX_RESTARTS = 1;

/**
 * SC-01B runtime hardening.
 * Worker owns decode execution only; camera/session/ROI policy stays on Main Thread.
 * Runtime recovery is capped to one restart per bridge instance.
 */
export class ScannerDecodeWorkerBridge {
  private worker: Worker | null = null;
  private generation = 0;
  private nextJobId = 0;
  private ready = false;
  private disposed = false;
  private restarting = false;
  private restartCount = 0;
  private formats: ScannerSymbology[] = [];
  private lastError: ScannerWorkerRuntimeError | null = null;
  private inFlight: PendingFrame | null = null;
  private latestPending: PendingFrame | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private initResolve: (() => void) | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;

  get runtimeError(): ScannerWorkerRuntimeError | null {
    return this.lastError;
  }

  async initialize(formats: ScannerSymbology[]): Promise<void> {
    if (this.disposed) throw new ScannerWorkerRuntimeError('Scanner Worker bridge is disposed.', { phase: 'dispose', code: 'DISPOSED', generation: this.generation });
    if (this.worker) throw new Error('Scanner worker bridge already initialized.');
    this.formats = [...new Set(formats)];
    this.lastError = null;
    try {
      await this.startWorker();
    } catch (error) {
      const firstError = this.toRuntimeError(error, 'init', 'INIT_FAILED');
      this.terminateWorker();
      if (this.restartCount >= MAX_RESTARTS || this.disposed) throw firstError;
      this.restartCount += 1;
      await this.startWorker().catch((retryError) => {
        this.terminateWorker();
        throw this.toRuntimeError(retryError, 'init', 'INIT_FAILED');
      });
    }
  }

  decode(frame: ImageData): Promise<ScannerWorkerDecodeResult> {
    if (this.disposed || !this.ready || !this.worker) return Promise.reject(new ScannerWorkerRuntimeError('Scanner Worker is not ready.', { phase: 'runtime', code: 'INIT_FAILED', generation: this.generation, recoverable: true }));
    if (!Number.isSafeInteger(frame.width) || !Number.isSafeInteger(frame.height)
      || frame.width < 1 || frame.height < 1 || frame.width * frame.height > 1_500_000
      || frame.data.length !== frame.width * frame.height * 4) {
      return Promise.reject(new ScannerWorkerRuntimeError('Invalid or oversized frame for Worker decode.', { phase: 'decode', code: 'PROTOCOL_ERROR', generation: this.generation }));
    }
    const jobId = ++this.nextJobId;
    return new Promise((resolve) => {
      const next: PendingFrame = { jobId, frame, resolve, timeout: null };
      if (!this.inFlight) {
        this.send(next);
        return;
      }
      // Latest-frame-wins: drop older pending work instead of building a queue.
      this.resolveFrame(this.latestPending, []);
      this.latestPending = next;
    });
  }

  cancelCurrent(): void {
    if (!this.worker || !this.inFlight) return;
    this.worker.postMessage({ type: 'CANCEL', protocolVersion: PROTOCOL_VERSION, generation: this.generation, jobId: this.inFlight.jobId } satisfies WorkerCommand);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.clearInitTimeout();
    this.initReject?.(new ScannerWorkerRuntimeError('Scanner Worker bridge disposed during initialization.', { phase: 'dispose', code: 'DISPOSED', generation: this.generation }));
    this.initReject = null;
    this.initResolve = null;
    this.resolveFrame(this.inFlight, []);
    this.resolveFrame(this.latestPending, []);
    this.inFlight = null;
    this.latestPending = null;
    this.terminateWorker(true);
  }

  private async startWorker(): Promise<void> {
    if (this.disposed) throw new Error('Scanner Worker bridge disposed.');
    const generation = ++this.generation;
    const worker = new Worker(new URL('./scannerDecodeWorker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    const ready = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => this.onMessage(event.data);
    worker.onerror = (event) => {
      this.failInitializationOrRecover(new ScannerWorkerRuntimeError(event.message || 'Scanner Worker crashed.', { phase: 'runtime', code: 'WORKER_CRASH', generation, recoverable: true }));
    };
    worker.onmessageerror = () => {
      this.failInitializationOrRecover(new ScannerWorkerRuntimeError('Scanner Worker message could not be decoded.', { phase: 'protocol', code: 'MESSAGE_ERROR', generation, recoverable: true }));
    };
    this.initTimeout = setTimeout(() => {
      this.failInitializationOrRecover(new ScannerWorkerRuntimeError('Scanner Worker initialization timed out.', { phase: 'init', code: 'INIT_TIMEOUT', generation, recoverable: true }));
    }, INIT_TIMEOUT_MS);
    worker.postMessage({ type: 'INIT', protocolVersion: PROTOCOL_VERSION, generation, formats: this.formats } satisfies WorkerCommand);
    await ready;
  }

  private send(frame: PendingFrame): void {
    const worker = this.worker;
    if (!worker || this.disposed || !this.ready) {
      this.resolveFrame(frame, []);
      return;
    }
    this.inFlight = frame;
    frame.timeout = setTimeout(() => this.handleDecodeTimeout(frame.jobId, this.generation), DECODE_TIMEOUT_MS);
    // Transfer a copy so the caller's ImageData remains usable.
    const pixels = new Uint8ClampedArray(frame.frame.data).buffer;
    worker.postMessage({
      type: 'DECODE',
      protocolVersion: PROTOCOL_VERSION,
      generation: this.generation,
      jobId: frame.jobId,
      width: frame.frame.width,
      height: frame.frame.height,
      pixels,
    } satisfies WorkerCommand, [pixels]);
  }

  private finishFrame(jobId: number, results: ScannerWorkerDecodeResult): void {
    if (this.inFlight?.jobId !== jobId) return;
    const finished = this.inFlight;
    this.inFlight = null;
    this.resolveFrame(finished, results);
    if (this.latestPending && this.ready && !this.disposed) {
      const next = this.latestPending;
      this.latestPending = null;
      this.send(next);
    }
  }

  private onMessage(message: WorkerReply): void {
    if (!message || message.protocolVersion !== PROTOCOL_VERSION || message.generation !== this.generation) return;
    if (message.type === 'READY') {
      this.clearInitTimeout();
      if (this.disposed) return;
      this.ready = true;
      this.initResolve?.();
      this.initResolve = null;
      this.initReject = null;
      return;
    }
    if (message.type === 'ERROR') {
      const error = new ScannerWorkerRuntimeError(message.error || 'Scanner Worker error.', {
        phase: message.phase === 'init' ? 'init' : 'decode',
        code: message.phase === 'init' ? 'INIT_FAILED' : 'PROTOCOL_ERROR',
        generation: message.generation,
        recoverable: message.phase === 'init',
      });
      if (message.phase === 'init' || message.jobId === undefined) {
        this.failInitializationOrRecover(error);
      } else {
        // Frame-level decode errors fail only that frame; Worker remains usable.
        this.finishFrame(message.jobId, []);
      }
      return;
    }
    if (message.type === 'RESULT') this.finishFrame(message.jobId, message.stale ? [] : message.results);
    if (message.type === 'DISPOSED') this.terminateWorker();
  }

  private handleDecodeTimeout(jobId: number, generation: number): void {
    if (generation !== this.generation || this.inFlight?.jobId !== jobId || this.disposed) return;
    const timeoutError = new ScannerWorkerRuntimeError('Scanner Worker decode timed out.', { phase: 'decode', code: 'DECODE_TIMEOUT', generation, recoverable: true });
    this.lastError = timeoutError;
    this.resolveFrame(this.inFlight, []);
    this.inFlight = null;
    this.resolveFrame(this.latestPending, []);
    this.latestPending = null;
    void this.recover(timeoutError);
  }

  private failInitializationOrRecover(error: ScannerWorkerRuntimeError): void {
    if (this.disposed || error.generation !== this.generation) return;
    this.clearInitTimeout();
    this.ready = false;
    this.lastError = error;
    const failedDuringInit = Boolean(this.initReject);
    this.initReject?.(error);
    this.initReject = null;
    this.initResolve = null;
    this.resolveFrame(this.inFlight, []);
    this.resolveFrame(this.latestPending, []);
    this.inFlight = null;
    this.latestPending = null;
    if (failedDuringInit) this.terminateWorker();
    else void this.recover(error);
  }

  private async recover(error: ScannerWorkerRuntimeError): Promise<void> {
    if (this.disposed || this.restarting) return;
    this.restarting = true;
    this.lastError = error;
    this.terminateWorker();
    if (this.restartCount >= MAX_RESTARTS) {
      this.restarting = false;
      return;
    }
    this.restartCount += 1;
    try {
      await this.startWorker();
    } catch (retryError) {
      this.lastError = this.toRuntimeError(retryError, 'init', 'INIT_FAILED');
      this.terminateWorker();
    } finally {
      this.restarting = false;
    }
  }

  private resolveFrame(frame: PendingFrame | null, results: ScannerWorkerDecodeResult): void {
    if (!frame) return;
    if (frame.timeout) clearTimeout(frame.timeout);
    frame.timeout = null;
    frame.resolve(results);
  }

  private clearInitTimeout(): void {
    if (this.initTimeout) clearTimeout(this.initTimeout);
    this.initTimeout = null;
  }

  private terminateWorker(sendDispose = false): void {
    const worker = this.worker;
    this.worker = null;
    if (!worker) return;
    if (sendDispose) {
      try { worker.postMessage({ type: 'DISPOSE', protocolVersion: PROTOCOL_VERSION, generation: this.generation } satisfies WorkerCommand); } catch { /* termination is authoritative */ }
    }
    worker.terminate();
  }

  private toRuntimeError(error: unknown, phase: ScannerWorkerErrorPhase, code: ScannerWorkerErrorCode): ScannerWorkerRuntimeError {
    if (error instanceof ScannerWorkerRuntimeError) return error;
    return new ScannerWorkerRuntimeError(error instanceof Error ? error.message : String(error), { phase, code, generation: this.generation, recoverable: true });
  }
}
