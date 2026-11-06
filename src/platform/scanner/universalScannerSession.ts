import type {
  ScannerLifecycleState,
  ScannerOpenOptions,
  ScannerSession,
  ScannerError,
  ScannerSymbology,
} from './contracts';
import { acquireCameraStream, releaseCameraStream, subscribeCameraTrackEnded } from '../../shared/services/cameraSession';
import type { ScannerDecoderAdapter } from './decoders/decoderAdapter';
import { ZBarWasmDecoderAdapter } from './decoders/zbarWasmDecoder';

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

function hasValidEanChecksum(value: string): boolean {
  if (!/^\d+$/.test(value) || (value.length !== 8 && value.length !== 13)) return false;
  const body = value.slice(0, -1);
  const expected = Number(value.slice(-1));
  const sum = [...body].reduce((total, digit, index) => {
    const weight = (body.length - index) % 2 === 0 ? 3 : 1;
    return total + Number(digit) * weight;
  }, 0);
  return (10 - (sum % 10)) % 10 === expected;
}

function isValidValue(value: string, symbology: ScannerSymbology): boolean {
  const normalized = value.trim();
  if (symbology === 'EAN_8' || symbology === 'EAN_13') {
    const expectedLength = symbology === 'EAN_8' ? 8 : 13;
    return normalized.length === expectedLength && hasValidEanChecksum(normalized);
  }
  return normalized.length > 0 && !/[\u0000-\u001f\u007f]/.test(normalized);
}

/** Owns one camera lease, one decoder and one bounded frame loop. */
export class UniversalScannerSession implements ScannerSession {
  readonly id = `scanner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private currentState: ScannerLifecycleState = 'idle';
  private stream: MediaStream | null = null;
  private decoder: ScannerDecoderAdapter | null = null;
  private frameHandle: number | null = null;
  private frameKind: 'video' | 'raf' | null = null;
  private generation = 0;
  private decoding = false;
  private startPromise: Promise<void> | null = null;
  private lastAcceptedAt = 0;
  private acceptedSingle = false;
  private disposed = false;
  private unsubscribeTrackEnded: (() => void) | null = null;

  constructor(private readonly video: HTMLVideoElement, private readonly options: ScannerOpenOptions) {}
  get state(): ScannerLifecycleState { return this.currentState; }

  private setState(state: ScannerLifecycleState): void {
    this.currentState = state;
    this.options.onStateChange?.(state);
  }

  start(): Promise<void> {
    if (this.disposed || this.currentState === 'scanning') return Promise.resolve();
    if (this.startPromise) return this.startPromise;
    const pending = this.startInternal();
    this.startPromise = pending;
    void pending.finally(() => {
      if (this.startPromise === pending) this.startPromise = null;
    });
    return pending;
  }

  private async startInternal(): Promise<void> {
    const generation = ++this.generation;
    this.setState('requesting');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera cần HTTPS hoặc localhost và quyền truy cập mediaDevices.');
      }
      const stream = await acquireCameraStream();
      if (this.disposed || generation !== this.generation) {
        releaseCameraStream(stream);
        return;
      }
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
      await this.video.play();
      if (this.disposed || generation !== this.generation) return;

      this.setState('initializing');
      const decoder = await this.createDecoder();
      if (this.disposed || generation !== this.generation) {
        await decoder.dispose();
        return;
      }
      this.decoder = decoder;
      this.acceptedSingle = false;
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
    const decoder = new ZBarWasmDecoderAdapter();
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
    if (this.decoding || !this.decoder || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scheduleNextFrame(generation);
      return;
    }
    this.decoding = true;
    try {
      const results = await this.decoder.decode(this.video, timestamp);
      if (generation !== this.generation || this.disposed || this.currentState !== 'scanning') return;
      const now = Date.now();
      for (const result of results) {
        const value = result.value.trim();
        if (!isValidValue(value, result.symbology)) continue;
        if (this.options.mode === 'single' && this.acceptedSingle) break;
        if (this.options.mode === 'continuous' && now - this.lastAcceptedAt < (this.options.sameCodeCooldownMs ?? 700)) continue;
        this.acceptedSingle = true;
        this.lastAcceptedAt = now;
        this.options.onResult({ ...result, value });
        if (this.options.mode === 'single') {
          await this.close();
          return;
        }
      }
    } catch (cause) {
      if (generation === this.generation && !this.disposed) {
        this.options.onError?.({
          code: 'DECODER_FAILED',
          message: cause instanceof Error ? cause.message : 'Lỗi giải mã barcode.',
          recoverable: true,
          cause,
        });
      }
    } finally {
      this.decoding = false;
      this.scheduleNextFrame(generation);
    }
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

  async close(): Promise<void> {
    if (this.disposed) return;
    ++this.generation;
    await this.teardown(true);
    this.disposed = true;
    this.setState('disposed');
  }

  private async teardown(release: boolean): Promise<void> {
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
    if (decoder) await decoder.dispose();
    const stream = this.stream;
    this.stream = null;
    if (this.video.srcObject === stream) this.video.srcObject = null;
    if (release && stream) releaseCameraStream(stream);
  }
}