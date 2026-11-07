import type {
  ScannerLifecycleState,
  ScannerOpenOptions,
  ScannerSession,
  ScannerError,
} from './contracts';
import { acquireCameraLease, subscribeCameraTrackEnded, type CameraStreamLease } from '../../shared/services/cameraSession';
import type { ScannerDecoderAdapter } from './decoders/decoderAdapter';
import { ZXingDecoderAdapter } from './decoders/zxingDecoder';
import { validateBarcodePayload } from './barcodeValidation';

function scannerError(cause: unknown): ScannerError {
  const name = cause instanceof DOMException ? cause.name : '';
  const message = cause instanceof Error ? cause.message : 'Không thể khởi động máy quét.';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { code: 'PERMISSION_DENIED', message: 'Quyền camera bị từ chối. Hãy cấp quyền camera trong trình duyệt rồi thử lại.', recoverable: true, cause };
  }
  if (name === 'NotFoundError') return { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy camera trên thiết bị.', recoverable: true, cause };
  if (name === 'NotReadableError') return { code: 'DEVICE_BUSY', message: 'Camera đang được ứng dụng khác sử dụng.', recoverable: true, cause };
  if (name === 'AbortError') return { code: 'LIFECYCLE_CONFLICT', message: 'Yêu cầu camera cũ đã bị hủy. Hãy thử mở lại máy quét.', recoverable: true, cause };
  if (!window.isSecureContext) return { code: 'INSECURE_CONTEXT', message: 'Camera cần HTTPS hoặc localhost.', recoverable: false, cause };
  return { code: 'UNKNOWN', message, recoverable: true, cause };
}

/** Owns one camera lease, one decoder and one bounded frame loop. */
export class UniversalScannerSession implements ScannerSession {
  readonly id = `scanner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private currentState: ScannerLifecycleState = 'idle';
  private stream: MediaStream | null = null;
  private cameraLease: CameraStreamLease | null = null;
  private decoder: ScannerDecoderAdapter | null = null;
  private frameHandle: number | null = null;
  private frameKind: 'video' | 'raf' | null = null;
  private generation = 0;
  private decoding = false;
  private lastDecodeAt = 0;
  private startPromise: Promise<void> | null = null;
  private diagnosticStartedAt = Date.now();
  private readonly performanceStartedAt = performance.now();
  private lastFrameCallbackAt = 0;
  private firstAcceptedAt = 0;
  private longTaskObserver: PerformanceObserver | null = null;
  private diagnosticLongTasks = 0;
  private diagnosticMaxFrameGapMs = 0;
  private diagnosticDecodeDurationTotalMs = 0;
  private diagnosticDecodeDurationMaxMs = 0;
  private diagnosticFrames = 0;
  private diagnosticFramesWithSymbols = 0;
  private diagnosticAccepted = 0;
  private diagnosticRejected = 0;
  private diagnosticErrors = 0;
  private diagnosticCallbackErrors = 0;
  private diagnosticValidationReasons: Record<string, number> = {};
  private lastAcceptedAt = 0;
  private acceptedSingle = false;
  private disposed = false;
  private closePromise: Promise<void> | null = null;
  private unsubscribeTrackEnded: (() => void) | null = null;

  constructor(private readonly video: HTMLVideoElement, private readonly options: ScannerOpenOptions) {}
  get state(): ScannerLifecycleState { return this.currentState; }

  private setState(state: ScannerLifecycleState): void {
    this.currentState = state;
    this.options.onStateChange?.(state);
  }

  start(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.disposed || this.currentState === 'scanning') return Promise.resolve();
    if (this.startPromise) return this.startPromise;
    const pending = this.startInternal();
    this.startPromise = pending;
    void pending.then(
      () => { if (this.startPromise === pending) this.startPromise = null; },
      () => { if (this.startPromise === pending) this.startPromise = null; },
    );
    return pending;
  }

  private async startInternal(): Promise<void> {
    const generation = ++this.generation;
    this.setState('requesting');
    this.observeLongTasks();
    const cameraRequestStartedAt = performance.now();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera cần HTTPS hoặc localhost và quyền truy cập mediaDevices.');
      }
      const lease = await acquireCameraLease();
      this.logStage('camera_acquire_ms', performance.now() - cameraRequestStartedAt);
      const stream = lease.stream;
      if (this.disposed || generation !== this.generation) {
        lease.release();
        return;
      }
      this.cameraLease = lease;
      if (!stream.getVideoTracks().some((track) => track.readyState === 'live')) {
        throw new Error('Luồng camera đã kết thúc. Hãy thử kết nối lại camera.');
      }
      this.stream = stream;
      this.unsubscribeTrackEnded?.();
      this.unsubscribeTrackEnded = subscribeCameraTrackEnded((endedStream) => {
        if (this.stream !== endedStream || this.disposed) return;
        ++this.generation;
        void this.teardown(false);
        this.setState('error');
        this.options.onError?.({ code: 'STREAM_INTERRUPTED', message: 'Kết nối camera bị gián đoạn. Hãy nhấn thử lại để kết nối.', recoverable: true });
      });

      this.video.srcObject = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      const videoPlayStartedAt = performance.now();
      await this.video.play();
      this.logStage('video_play_ms', performance.now() - videoPlayStartedAt);
      if (this.disposed || generation !== this.generation) return;

      this.setState('initializing');
      const decoderInitStartedAt = performance.now();
      const decoder = await this.createDecoder();
      this.logStage('decoder_init_ms', performance.now() - decoderInitStartedAt);
      if (this.disposed || generation !== this.generation) {
        await decoder.dispose();
        return;
      }
      this.decoder = decoder;
      this.acceptedSingle = false;
      this.logStage('camera_to_scanning_ms', performance.now() - this.performanceStartedAt);
      this.setState('scanning');
      this.scheduleNextFrame(generation);
    } catch (cause) {
      if (generation !== this.generation || this.disposed) return;
      await this.teardown(true);
      const error = scannerError(cause);
      this.setState('error');
      this.options.onError?.(error);
    }
  }

  private async createDecoder(): Promise<ScannerDecoderAdapter> {
    const decoder = new ZXingDecoderAdapter();
    try {
      await decoder.initialize({ formats: this.options.formats });
      return decoder;
    } catch (error) {
      await decoder.dispose();
      throw error;
    }
  }

  private scheduleNextFrame(generation: number): void {
    if (this.disposed || generation !== this.generation || this.currentState !== 'scanning' || this.frameHandle !== null) return;
    const video = this.video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: (now: number) => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    if (typeof video.requestVideoFrameCallback === 'function') {
      this.frameKind = 'video';
      this.frameHandle = video.requestVideoFrameCallback((now) => {
        this.frameHandle = null;
        void this.processFrame(now, generation);
      });
      return;
    }
    this.frameKind = 'raf';
    this.frameHandle = window.requestAnimationFrame((now) => {
      this.frameHandle = null;
      void this.processFrame(now, generation);
    });
  }

  private async processFrame(timestamp: number, generation: number): Promise<void> {
    const minDecodeIntervalMs = 110;
    if (this.decoding || !this.decoder || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      || timestamp - this.lastDecodeAt < minDecodeIntervalMs) {
      this.scheduleNextFrame(generation);
      return;
    }
    this.decoding = true;
    if (this.lastFrameCallbackAt > 0) {
      this.diagnosticMaxFrameGapMs = Math.max(this.diagnosticMaxFrameGapMs, timestamp - this.lastFrameCallbackAt);
    }
    this.lastFrameCallbackAt = timestamp;
    this.lastDecodeAt = timestamp;
    const decodeStartedAt = performance.now();
    this.diagnosticFrames += 1;
    try {
      const results = await this.decoder.decode(this.video, timestamp);
      const decodeDurationMs = performance.now() - decodeStartedAt;
      this.diagnosticDecodeDurationTotalMs += decodeDurationMs;
      this.diagnosticDecodeDurationMaxMs = Math.max(this.diagnosticDecodeDurationMaxMs, decodeDurationMs);
      if (generation !== this.generation || this.disposed || this.currentState !== 'scanning') return;
      if (results.length > 0) this.diagnosticFramesWithSymbols += 1;
      const now = Date.now();
      for (const result of results) {
        // Preserve CODE-128 as an opaque payload; only EAN normalization occurs in validation.
        const value = result.value;
        const validation = validateBarcodePayload(value, result.symbology);
        if (!validation.valid) {
          this.diagnosticRejected += 1;
          this.diagnosticValidationReasons[validation.reason] = (this.diagnosticValidationReasons[validation.reason] ?? 0) + 1;
          continue;
        }
        if (this.options.mode === 'single' && this.acceptedSingle) break;
        if (this.options.mode === 'continuous' && now - this.lastAcceptedAt < (this.options.sameCodeCooldownMs ?? 700)) continue;
        this.acceptedSingle = true;
        this.lastAcceptedAt = now;
        this.diagnosticAccepted += 1;
        if (!this.firstAcceptedAt) {
          this.firstAcceptedAt = now;
          this.logStage('first_accepted_result_ms', performance.now() - this.performanceStartedAt);
        }
        if (this.options.mode === 'single') {
          // Claim the single result before calling feature code. Always close the
          // camera even if a module callback throws.
          try {
            this.deliverResult(result, value);
          } finally {
            await this.close();
          }
          return;
        }
        // A feature callback failure is not a decoder failure. Keep continuous
        // scanning alive and report the correct boundary error.
        this.deliverResult(result, value);
      }
    } catch (cause) {
      this.diagnosticErrors += 1;
      if (generation === this.generation && !this.disposed) {
        this.options.onError?.({
          code: 'DECODER_FAILED',
          message: cause instanceof Error ? cause.message : 'Lỗi giải mã barcode.',
          recoverable: true,
          cause,
        });
      }
    } finally {
      this.emitDiagnostics();
      this.decoding = false;
      this.scheduleNextFrame(generation);
    }
  }

  private deliverResult(result: import('./decoders/decoderAdapter').DecoderOutput, value: string): void {
    try {
      this.options.onResult({ ...result, value });
    } catch (cause) {
      this.diagnosticCallbackErrors += 1;
      this.options.onError?.({
        code: 'RESULT_HANDLER_FAILED',
        message: cause instanceof Error ? cause.message : 'Module không tiếp nhận được barcode đã quét.',
        recoverable: true,
        cause,
      });
    }
  }

  private emitDiagnostics(): void {
    const now = Date.now();
    if (now - this.diagnosticStartedAt < 5_000) return;
    console.info('[RetailOS Scanner] Runtime diagnostics', {
      session: this.id,
      decoder: this.decoder?.id ?? 'disposed',
      decodeAttempts: this.diagnosticFrames,
      framesWithSymbols: this.diagnosticFramesWithSymbols,
      accepted: this.diagnosticAccepted,
      rejectedByValidation: this.diagnosticRejected,
      decoderErrors: this.diagnosticErrors,
      callbackErrors: this.diagnosticCallbackErrors,
      decodeDurationAverageMs: this.diagnosticFrames ? Number((this.diagnosticDecodeDurationTotalMs / this.diagnosticFrames).toFixed(1)) : 0,
      decodeDurationMaxMs: Number(this.diagnosticDecodeDurationMaxMs.toFixed(1)),
      maxFrameCallbackGapMs: Number(this.diagnosticMaxFrameGapMs.toFixed(1)),
      longTasks: this.diagnosticLongTasks,
      validationRejectReasons: { ...this.diagnosticValidationReasons },
    });
    this.diagnosticStartedAt = now;
    this.diagnosticFrames = 0;
    this.diagnosticFramesWithSymbols = 0;
    this.diagnosticAccepted = 0;
    this.diagnosticRejected = 0;
    this.diagnosticErrors = 0;
    this.diagnosticCallbackErrors = 0;
    this.diagnosticDecodeDurationTotalMs = 0;
    this.diagnosticDecodeDurationMaxMs = 0;
    this.diagnosticMaxFrameGapMs = 0;
    this.diagnosticLongTasks = 0;
    this.diagnosticValidationReasons = {};
  }

  async suspend(): Promise<void> {
    if (this.disposed) return;
    ++this.generation;
    this.setState('suspended');
    await this.teardown(true);
  }

  async resume(): Promise<void> {
    if (this.disposed) return;
    await this.start();
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.disposed) return Promise.resolve();

    // Multiple owners may close the same session (single-result delivery,
    // React unmount, and an explicit close tap). Share one teardown promise so
    // decoder disposal and camera release happen exactly once.
    ++this.generation;
    this.closePromise = (async () => {
      await this.teardown(true);
      this.disposed = true;
      this.setState('disposed');
    })();
    return this.closePromise;
  }

  private async teardown(release: boolean): Promise<void> {
    const teardownStartedAt = performance.now();
    const video = this.video as HTMLVideoElement & { cancelVideoFrameCallback?: (handle: number) => void };
    if (this.frameHandle !== null) {
      if (this.frameKind === 'video' && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(this.frameHandle);
      else if (this.frameKind === 'raf') window.cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle = null;
    this.frameKind = null;
    this.unsubscribeTrackEnded?.();
    this.unsubscribeTrackEnded = null;
    const decoder = this.decoder;
    this.decoder = null;
    if (decoder) {
      const decoderDisposeStartedAt = performance.now();
      await decoder.dispose();
      this.logStage('decoder_dispose_ms', performance.now() - decoderDisposeStartedAt);
    }
    const stream = this.stream;
    this.stream = null;
    if (this.video.srcObject === stream) this.video.srcObject = null;
    const lease = this.cameraLease;
    this.cameraLease = null;
    if (release) {
      const cameraReleaseStartedAt = performance.now();
      lease?.release();
      this.logStage('camera_release_ms', performance.now() - cameraReleaseStartedAt);
    }
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
    this.logStage('teardown_total_ms', performance.now() - teardownStartedAt);
  }

  private logStage(stage: string, durationMs: number): void {
    console.info('[RetailOS Scanner] Performance stage', {
      session: this.id,
      stage,
      durationMs: Number(durationMs.toFixed(1)),
    });
  }

  private observeLongTasks(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) return;
      this.longTaskObserver = new PerformanceObserver((list) => {
        this.diagnosticLongTasks += list.getEntries().length;
      });
      this.longTaskObserver.observe({ type: 'longtask', buffered: false });
    } catch {
      this.longTaskObserver = null;
    }
  }
}