import type {
  ScannerLifecycleState,
  ScannerOpenOptions,
  ScannerSession,
  ScannerError,
  ScannerLifecycleObserver,
  ScannerTorchState,
  ScannerSourceScanRegion,
  ScannerCameraRequest,
} from './contracts';
import { DEFAULT_SCANNER_CAMERA_REQUEST } from './contracts';
import { acquireCameraLease, subscribeCameraTrackEnded, type CameraLeaseRequest, type CameraStreamLease } from '../../shared/services/cameraSession';
import type { ScannerDecoderAdapter } from './decoders/decoderAdapter';
import { ZXingDecoderAdapter } from './decoders/zxingDecoder';
import { validateBarcodePayload } from './barcodeValidation';
import { ScannerLifecycleAdapter } from './scannerLifecycleAdapter';
import { applyScannerTorch, readScannerTorchState } from './scannerTorch';
import { ScannerFocusWatchdog, type ScannerFocusQualitySample } from './scannerFocusQuality';

type VideoReadiness = {
  readyState: number;
  width: number;
  height: number;
  frameCallbackObserved: boolean;
};

function isVideoFrameAvailable(video: HTMLVideoElement): boolean {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    && video.videoWidth > 0
    && video.videoHeight > 0;
}

/**
 * Wait until the video element has real decoded frame dimensions. Safari may
 * resolve play() before the first usable frame is available.
 */
function waitForVideoFrameReady(video: HTMLVideoElement, timeoutMs = 3000): Promise<VideoReadiness> {
  const videoWithFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: (now: number) => void) => number;
    cancelVideoFrameCallback?: (handle: number) => void;
  };

  if (typeof videoWithFrameCallback.requestVideoFrameCallback !== 'function') {
    if (isVideoFrameAvailable(video)) {
      return Promise.resolve({
        readyState: video.readyState,
        width: video.videoWidth,
        height: video.videoHeight,
        frameCallbackObserved: false,
      });
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let frameHandle: number | null = null;
    let fallbackRafHandle: number | null = null;
    const hasVideoFrameCallback = typeof videoWithFrameCallback.requestVideoFrameCallback === 'function';
    const initialCurrentTime = video.currentTime;

    const cleanup = () => {
      window.clearTimeout(timeoutHandle);
      video.removeEventListener('loadeddata', checkReady);
      video.removeEventListener('canplay', checkReady);
      video.removeEventListener('timeupdate', checkReady);
      if (frameHandle !== null) videoWithFrameCallback.cancelVideoFrameCallback?.(frameHandle);
      if (fallbackRafHandle !== null) window.cancelAnimationFrame(fallbackRafHandle);
    };

    const finish = (frameCallbackObserved: boolean) => {
      if (settled || !isVideoFrameAvailable(video) || video.paused) return;
      settled = true;
      cleanup();
      resolve({
        readyState: video.readyState,
        width: video.videoWidth,
        height: video.videoHeight,
        frameCallbackObserved,
      });
    };

    // On browsers without requestVideoFrameCallback, dimensions/readyState alone
    // can describe a stale frame left over from before background suspension.
    // Require the live MediaStream timeline to advance before declaring READY.
    const checkReady = () => {
      if (!hasVideoFrameCallback && isVideoFrameAvailable(video)
        && !video.paused && video.currentTime > initialCurrentTime + 0.01) {
        finish(false);
      }
    };

    const timeoutHandle = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Camera đã mở nhưng chưa cung cấp được frame hình ảnh mới. Hãy giữ ứng dụng ở foreground và thử kết nối lại.'));
    }, timeoutMs);

    video.addEventListener('loadeddata', checkReady);
    video.addEventListener('canplay', checkReady);
    video.addEventListener('timeupdate', checkReady);

    const scheduleFrameCheck = () => {
      frameHandle = videoWithFrameCallback.requestVideoFrameCallback?.(() => {
        frameHandle = null;
        if (isVideoFrameAvailable(video) && !video.paused) {
          finish(true);
        } else {
          scheduleFrameCheck();
        }
      }) ?? null;
    };

    const pollFallbackFrame = () => {
      checkReady();
      if (!settled) fallbackRafHandle = window.requestAnimationFrame(pollFallbackFrame);
    };

    if (hasVideoFrameCallback) {
      scheduleFrameCheck();
    } else {
      pollFallbackFrame();
    }
  });
}

function scannerError(cause: unknown): ScannerError {
  const name = cause instanceof DOMException ? cause.name : cause instanceof Error ? cause.name : '';
  const message = cause instanceof Error ? cause.message : 'Không thể khởi động máy quét.';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { code: 'PERMISSION_DENIED', message: 'Quyền camera bị từ chối. Hãy cấp quyền camera trong trình duyệt rồi thử lại.', recoverable: true, cause };
  }
  if (name === 'NotFoundError') return { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy camera trên thiết bị.', recoverable: true, cause };
  if (name === 'NotReadableError') return { code: 'DEVICE_BUSY', message: 'Camera đang được ứng dụng khác sử dụng.', recoverable: true, cause };
  if (name === 'OverconstrainedError') return { code: 'CONSTRAINTS_UNSATISFIED', message, recoverable: true, cause };
  if (name === 'AbortError') return { code: 'LIFECYCLE_CONFLICT', message: 'Yêu cầu camera cũ đã bị hủy. Hãy thử mở lại máy quét.', recoverable: true, cause };
  if (!window.isSecureContext) return { code: 'INSECURE_CONTEXT', message: 'Camera cần HTTPS hoặc localhost.', recoverable: false, cause };
  return { code: 'UNKNOWN', message, recoverable: true, cause };
}

/** Owns one camera lease, one decoder and one bounded frame loop. */
export class UniversalScannerSession implements ScannerSession {
  readonly id = `scanner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private currentState: ScannerLifecycleState = 'idle';
  private sourceScanRegion: ScannerSourceScanRegion | null = null;
  private stream: MediaStream | null = null;
  private cameraLease: CameraStreamLease | null = null;
  private torchTrack: MediaStreamTrack | null = null;
  private torchState: ScannerTorchState = { supported: false, enabled: false, pending: false };
  private torchCommand: Promise<ScannerTorchState> | null = null;
  private readonly focusWatchdog = new ScannerFocusWatchdog();
  private focusControlEnabled = false;
  private focusRecoveryPending = false;
  private focusQualityStartedAt = Date.now();
  private focusQualitySamples = 0;
  private focusQualitySharpnessTotal = 0;
  private focusQualitySharpnessMin = Number.POSITIVE_INFINITY;
  private focusQualityEdgeCoverageTotal = 0;
  private focusRecoveryRequests = 0;
  private decoder: ScannerDecoderAdapter | null = null;
  private frameHandle: number | null = null;
  private frameKind: 'video' | 'raf' | null = null;
  private generation = 0;
  private decoding = false;
  private lastDecodeAt = 0;
  private startPromise: Promise<void> | null = null;
  private diagnosticStartedAt = Date.now();
  private startAttemptStartedAt = 0;
  private hasLoggedFirstAcceptedForAttempt = false;
  private lastFrameCallbackAt = 0;
  private longTaskObserver: PerformanceObserver | null = null;
  private layoutShiftObserver: PerformanceObserver | null = null;
  private diagnosticLayoutShiftScore = 0;
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
  private suspendPromise: Promise<void> | null = null;
  private recoveryDisposePromise: Promise<void> | null = null;
  private unsubscribeTrackEnded: (() => void) | null = null;
  private trackEventCleanups: Array<() => void> = [];
  private readonly lifecycle: ScannerLifecycleAdapter;
  private readonly cameraRequest: ScannerCameraRequest;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly options: ScannerOpenOptions,
    private initialCameraLeaseRequest?: CameraLeaseRequest,
    cameraRequest: ScannerCameraRequest = DEFAULT_SCANNER_CAMERA_REQUEST,
  ) {
    // The tap-origin request is authoritative for the initial session. Keep
    // its immutable intent on the session so a fresh recovery session can
    // reacquire with the same module configuration after the request is spent.
    this.cameraRequest = initialCameraLeaseRequest?.cameraRequest ?? cameraRequest;
    this.lifecycle = new ScannerLifecycleAdapter(this.id, options.lifecycleObserver);
  }
  get state(): ScannerLifecycleState { return this.currentState; }

  getTorchState(): ScannerTorchState {
    return { ...this.torchState };
  }

  setScanRegion(region: ScannerSourceScanRegion | null): void {
    if (!region || region.coordinateSpace !== 'source-frame-normalized'
      || !region.rect || typeof region.rect !== 'object') {
      this.sourceScanRegion = null;
      return;
    }

    const rect = region.rect;
    const valid = Number.isFinite(rect.x) && Number.isFinite(rect.y)
      && Number.isFinite(rect.width) && Number.isFinite(rect.height)
      && rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0
      && rect.x + rect.width <= 1 + 1e-7
      && rect.y + rect.height <= 1 + 1e-7;
    this.sourceScanRegion = valid
      ? { coordinateSpace: 'source-frame-normalized', rect: { ...rect } }
      : null;
  }

  getScanRegion(): ScannerSourceScanRegion | null {
    const region = this.sourceScanRegion;
    return region ? {
      coordinateSpace: 'source-frame-normalized',
      rect: { ...region.rect },
    } : null;
  }

  async setTorchEnabled(enabled: boolean): Promise<ScannerTorchState> {
    if (this.torchCommand) return this.torchCommand;
    const track = this.torchTrack;
    const generation = this.generation;
    if (!track || track.readyState !== 'live' || !this.torchState.supported || this.disposed) {
      return this.getTorchState();
    }

    const command = (async () => {
      this.updateTorchState({ ...this.torchState, pending: true, error: undefined });
      try {
        const result = await applyScannerTorch(track, enabled);
        if (generation !== this.generation || this.torchTrack !== track || this.disposed) return this.getTorchState();
        this.updateTorchState(result);
        return this.getTorchState();
      } finally {
        if (this.torchTrack === track && this.generation === generation) this.torchCommand = null;
      }
    })();
    this.torchCommand = command;
    return command;
  }

  private updateTorchState(state: ScannerTorchState): void {
    this.torchState = { ...state };
    try {
      this.options.onTorchStateChange?.(this.getTorchState());
    } catch (cause) {
      console.warn('[RetailOS Scanner] Torch observer failed:', cause);
    }
  }

  private bindTorchTrack(stream: MediaStream): void {
    const track = stream.getVideoTracks()[0] ?? null;
    this.torchTrack = track;
    this.torchCommand = null;
    this.updateTorchState(readScannerTorchState(track));
  }

  private setState(state: ScannerLifecycleState): void {
    this.currentState = state;
    this.options.onStateChange?.(state);
  }

  start(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.recoveryDisposePromise) return this.recoveryDisposePromise;
    if (this.suspendPromise) return this.suspendPromise.then(() => this.start());
    if (this.disposed || this.currentState === 'scanning') return Promise.resolve();
    if (this.startPromise) {
      const pendingStart = this.startPromise;
      return pendingStart.then(() => {
        // If suspend invalidated an in-flight permission/camera request, retry
        // once that stale attempt settles and the session is still suspended.
        if (!this.disposed && this.currentState === 'suspended') return this.start();
      });
    }
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
    this.lifecycle.opening();
    this.setState('requesting');
    this.startAttemptStartedAt = performance.now();
    this.hasLoggedFirstAcceptedForAttempt = false;
    this.observeLongTasks();
    const cameraRequestStartedAt = performance.now();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera cần HTTPS hoặc localhost và quyền truy cập mediaDevices.');
      }
      const initialRequest = this.initialCameraLeaseRequest;
      this.initialCameraLeaseRequest = undefined;
      const lease = initialRequest
        ? await initialRequest.claim()
        : await acquireCameraLease(this.cameraRequest);
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
      this.trackEventCleanups.splice(0).forEach((cleanup) => cleanup());
      stream.getVideoTracks().forEach((track) => {
        const logTrackEvent = (trackEvent: 'mute' | 'unmute') => {
          console.info('[RetailOS Scanner] Camera track', {
            trackEvent,
            trackMuted: track.muted,
            trackReadyState: track.readyState,
          });
        };
        const onMute = () => logTrackEvent('mute');
        const onUnmute = () => logTrackEvent('unmute');
        track.addEventListener('mute', onMute);
        track.addEventListener('unmute', onUnmute);
        this.trackEventCleanups.push(() => {
          track.removeEventListener('mute', onMute);
          track.removeEventListener('unmute', onUnmute);
        });
      });
      this.unsubscribeTrackEnded?.();
      this.unsubscribeTrackEnded = subscribeCameraTrackEnded((endedStream) => {
        if (this.stream !== endedStream || this.disposed) return;
        ++this.generation;
        void this.teardown(false);
        this.setState('error');
        this.options.onError?.({ code: 'STREAM_INTERRUPTED', message: 'Kết nối camera bị gián đoạn. Hãy nhấn thử lại để kết nối.', recoverable: true });
      });

      // The platform engine attaches the stream to the supplied video element
      // without inspecting its DOM geometry. Each feature owns the element's
      // container, sizing, crop, visibility and presentation layout.
      this.video.srcObject = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      const videoPlayStartedAt = performance.now();
      await this.video.play();
      this.logStage('video_play_ms', performance.now() - videoPlayStartedAt);
      if (this.disposed || generation !== this.generation) return;

      const videoReadyStartedAt = performance.now();
      const videoReadiness = await waitForVideoFrameReady(this.video);
      this.logStage('video_ready_ms', performance.now() - videoReadyStartedAt);
      console.info('[RetailOS Scanner] Video readiness', {
        videoReadyState: videoReadiness.readyState,
        videoWidth: videoReadiness.width,
        videoHeight: videoReadiness.height,
        frameCallbackObserved: videoReadiness.frameCallbackObserved,
      });
      if (this.disposed || generation !== this.generation) return;

      // Chromium may expose camera capabilities only after the track is
      // actively streaming. Discover Torch and request continuous autofocus
      // only after playback has produced a fresh frame.
      this.bindTorchTrack(stream);
      const autofocusStartedAt = performance.now();
      void lease.prepareForScanning()
        .then((focusResults) => {
          if (generation !== this.generation || this.stream !== stream || this.disposed) return;
          const focusResult = focusResults[0] ?? {
            status: 'unavailable' as const,
            supportedModes: [],
            durationMs: 0,
          };
          console.info('[RetailOS Scanner] Performance stage', {
            stage: 'optional_autofocus_ms',
            durationMs: Number((performance.now() - autofocusStartedAt).toFixed(1)),
          });
          this.focusControlEnabled = focusResult.status === 'continuous-requested'
            && (!focusResult.actualMode || focusResult.actualMode === 'continuous');
          this.focusWatchdog.reset();
          console.info('[RetailOS Scanner] Camera focus', {
            focusStatus: focusResult.status,
            focusModes: focusResult.supportedModes.join(','),
            focusMode: focusResult.actualMode,
            focusRequestMs: focusResult.durationMs,
            focusErrorName: focusResult.errorName,
          });
        })
        .catch((error: unknown) => {
          console.warn('[RetailOS Scanner] Optional autofocus diagnostic failed:', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
        });
      // Publish preview readiness before decoder initialization so the UI can
      // reveal the live camera as soon as the first real frame is available.
      this.options.onPreviewReady?.();
      this.lifecycle.ready();
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
      this.logStage('camera_to_scanning_ms', performance.now() - this.startAttemptStartedAt);
      this.setState('scanning');
      this.lifecycle.scanning();
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
    if (this.lastFrameCallbackAt > 0) {
      this.diagnosticMaxFrameGapMs = Math.max(this.diagnosticMaxFrameGapMs, timestamp - this.lastFrameCallbackAt);
    }
    this.lastFrameCallbackAt = timestamp;
    const minDecodeIntervalMs = 70;
    if (this.decoding || !this.decoder || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      || timestamp - this.lastDecodeAt < minDecodeIntervalMs) {
      this.scheduleNextFrame(generation);
      return;
    }
    this.decoding = true;
    this.lastDecodeAt = timestamp;
    const decodeStartedAt = performance.now();
    this.diagnosticFrames += 1;
    try {
      const results = await this.decoder.decode(this.video, {
        timestamp,
        scanRegion: this.getScanRegion(),
        onFocusQuality: (sample) => this.handleFocusQuality(sample, timestamp, generation),
      });
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
        if (!this.hasLoggedFirstAcceptedForAttempt) {
          this.hasLoggedFirstAcceptedForAttempt = true;
          this.logStage('first_accepted_result_ms', performance.now() - this.startAttemptStartedAt);
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

  private handleFocusQuality(
    sample: ScannerFocusQualitySample,
    timestamp: number,
    generation: number,
  ): void {
    if (!sample.valid || generation !== this.generation || this.disposed) return;

    this.focusQualitySamples += 1;
    this.focusQualitySharpnessTotal += sample.sharpness;
    this.focusQualitySharpnessMin = Math.min(this.focusQualitySharpnessMin, sample.sharpness);
    this.focusQualityEdgeCoverageTotal += sample.edgeCoverage;

    if (this.focusControlEnabled && !this.focusRecoveryPending
      && this.focusWatchdog.observe(sample, timestamp)) {
      const lease = this.cameraLease;
      const stream = this.stream;
      const track = stream?.getVideoTracks()[0] ?? null;
      if (lease && stream && track?.readyState === 'live') {
        this.focusRecoveryPending = true;
        this.focusRecoveryRequests += 1;
        console.warn('[RetailOS Scanner] Camera focus recovery', {
          focusRecoveryStatus: 'requested',
          focusSharpness: sample.sharpness,
          focusEdgeCoverage: sample.edgeCoverage,
          focusMotionScore: sample.motionScore,
          focusRecoveryRequests: this.focusRecoveryRequests,
        });
        void lease.reapplyContinuousAutofocus()
          .then((results) => {
            if (generation !== this.generation || this.stream !== stream || this.disposed) return;
            const result = results[0];
            console.info('[RetailOS Scanner] Camera focus recovery', {
              focusRecoveryStatus: result?.status ?? 'unavailable',
              focusMode: result?.actualMode,
              focusModes: result?.supportedModes.join(',') ?? '',
              focusRequestMs: result?.durationMs ?? 0,
              focusErrorName: result?.errorName,
              focusSharpness: sample.sharpness,
              focusEdgeCoverage: sample.edgeCoverage,
              focusMotionScore: sample.motionScore,
              focusRecoveryRequests: this.focusRecoveryRequests,
            });
          })
          .catch((error: unknown) => {
            console.warn('[RetailOS Scanner] Camera focus recovery failed', {
              focusRecoveryStatus: 'failed',
              focusErrorName: error instanceof Error ? error.name : 'UnknownError',
              focusRecoveryRequests: this.focusRecoveryRequests,
            });
          })
          .finally(() => {
            if (generation === this.generation) this.focusRecoveryPending = false;
          });
      }
    }

    const now = Date.now();
    if (now - this.focusQualityStartedAt < 5_000) return;
    console.info('[RetailOS Scanner] Camera focus quality', {
      focusQualitySamples: this.focusQualitySamples,
      focusSharpness: Number((this.focusQualitySharpnessTotal / this.focusQualitySamples).toFixed(2)),
      focusSharpnessMin: Number(this.focusQualitySharpnessMin.toFixed(2)),
      focusEdgeCoverage: Number((this.focusQualityEdgeCoverageTotal / this.focusQualitySamples).toFixed(4)),
      focusRecoveryRequests: this.focusRecoveryRequests,
      focusControlEnabled: this.focusControlEnabled,
    });
    this.focusQualityStartedAt = now;
    this.focusQualitySamples = 0;
    this.focusQualitySharpnessTotal = 0;
    this.focusQualitySharpnessMin = Number.POSITIVE_INFINITY;
    this.focusQualityEdgeCoverageTotal = 0;
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
      layoutShiftScore: Number(this.diagnosticLayoutShiftScore.toFixed(4)),
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
    this.diagnosticLayoutShiftScore = 0;
    this.diagnosticValidationReasons = {};
  }

  suspend(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.disposed) return Promise.resolve();
    if (this.suspendPromise) return this.suspendPromise;
    ++this.generation;
    this.setState('suspended');
    const pending = this.teardown(true);
    this.suspendPromise = pending;
    const clearPending = () => {
      if (this.suspendPromise === pending) this.suspendPromise = null;
    };
    void pending.then(clearPending, clearPending);
    return pending;
  }

  async resume(): Promise<void> {
    if (this.disposed) return;
    await this.start();
  }

  /**
   * Retire a suspended session before binding a fresh video surface.
   * Unlike close(), recovery disposal must not publish feature exit milestones:
   * the scanner overlay remains open and the feature continues the same task.
   */
  disposeForRecovery(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.recoveryDisposePromise) return this.recoveryDisposePromise;
    if (this.disposed) return Promise.resolve();

    ++this.generation;
    this.setState('suspended');
    this.recoveryDisposePromise = (async () => {
      await this.suspendPromise;
      await this.teardown(true);
      this.disposed = true;
      this.setState('disposed');
    })();
    return this.recoveryDisposePromise;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;

    // A user may close the feature while foreground recovery is retiring the
    // previous session. Wait for that teardown, then publish the normal exit
    // milestones; recovery itself must never masquerade as a feature close.
    if (this.recoveryDisposePromise) {
      this.lifecycle.sessionCloseStarted();
      this.closePromise = (async () => {
        await this.recoveryDisposePromise;
        this.lifecycle.cameraLeaseReleased();
        this.setState('disposed');
        this.lifecycle.disposed();
      })();
      return this.closePromise;
    }

    if (this.disposed) return Promise.resolve();

    // Multiple owners may close the same session (single-result delivery,
    // React unmount, and an explicit close tap). Share one teardown promise so
    // decoder disposal and camera release happen exactly once.
    ++this.generation;
    this.lifecycle.sessionCloseStarted();
    this.closePromise = (async () => {
      await this.suspendPromise;
      await this.teardown(true);
      this.disposed = true;
      this.setState('disposed');
      this.lifecycle.disposed();
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
    this.trackEventCleanups.splice(0).forEach((cleanup) => cleanup());
    // Stop camera ownership before awaiting decoder disposal. The decoder is
    // no longer scheduled; its cleanup must never keep the physical camera
    // leased while a closing transition is running or a worker is slow.
    const stream = this.stream;
    this.stream = null;
    this.torchTrack = null;
    this.torchCommand = null;
    this.focusControlEnabled = false;
    this.focusRecoveryPending = false;
    this.focusWatchdog.reset();
    this.updateTorchState({ supported: false, enabled: false, pending: false });
    if (this.video.srcObject === stream) {
      try {
        this.video.pause();
      } catch {
        // Detaching the stream below remains the authoritative cleanup.
      }
      this.video.srcObject = null;
    }
    const lease = this.cameraLease;
    this.cameraLease = null;
    if (release) {
      const cameraReleaseStartedAt = performance.now();
      try {
        lease?.release();
        if (this.closePromise && !this.recoveryDisposePromise) this.lifecycle.cameraLeaseReleased();
      } finally {
        this.logStage('camera_release_ms', performance.now() - cameraReleaseStartedAt);
      }
    }
    const decoder = this.decoder;
    this.decoder = null;
    if (decoder) {
      const decoderDisposeStartedAt = performance.now();
      try {
        await decoder.dispose();
      } catch (cause) {
        console.warn('[RetailOS Scanner] Decoder disposal failed', {
          errorName: cause instanceof Error ? cause.name : 'UnknownError',
        });
      }
      this.logStage('decoder_dispose_ms', performance.now() - decoderDisposeStartedAt);
    }
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
    this.layoutShiftObserver?.disconnect();
    this.layoutShiftObserver = null;
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
    try {
      if (!PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) return;
      this.layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput && typeof shift.value === 'number') {
            this.diagnosticLayoutShiftScore += shift.value;
          }
        }
      });
      this.layoutShiftObserver.observe({ type: 'layout-shift', buffered: false });
    } catch {
      this.layoutShiftObserver = null;
    }
  }
}