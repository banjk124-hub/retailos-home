import type {
  ScannerLifecycleState,
  ScannerOpenOptions,
  ScannerSession,
  ScannerError,
  ScannerSymbology,
} from './contracts';
import { acquireCameraStream, releaseCameraStream } from '../../shared/services/cameraSession';
import type { ScannerDecoderAdapter } from './decoders/decoderAdapter';
import { NativeBarcodeDetectorAdapter } from './decoders/nativeBarcodeDetector';
import { ZXingDecoderAdapter } from './decoders/zxingDecoder';

const FORMATS: ScannerSymbology[] = ['EAN_8', 'EAN_13', 'CODE_128'];

function scannerError(cause: unknown): ScannerError {
  const name = cause instanceof DOMException ? cause.name : '';
  const message = cause instanceof Error ? cause.message : 'Không thể khởi động máy quét.';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { code: 'PERMISSION_DENIED', message: 'Quyền camera bị từ chối. Hãy cấp quyền camera trong trình duyệt rồi thử lại.', recoverable: true, cause };
  }
  if (name === 'NotFoundError') return { code: 'DEVICE_NOT_FOUND', message: 'Không tìm thấy camera trên thiết bị.', recoverable: true, cause };
  if (name === 'NotReadableError') return { code: 'DEVICE_BUSY', message: 'Camera đang được ứng dụng khác sử dụng.', recoverable: true, cause };
  if (!window.isSecureContext) return { code: 'INSECURE_CONTEXT', message: 'Camera cần HTTPS hoặc localhost.', recoverable: false, cause };
  return { code: 'UNKNOWN', message, recoverable: true, cause };
}

function isValidValue(value: string, symbology: ScannerSymbology): boolean {
  if (symbology === 'EAN_8') return /^\d{8}$/.test(value);
  if (symbology === 'EAN_13') return /^\d{13}$/.test(value);
  return value.length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
}

/**
 * One live scanner session. It owns exactly one camera lease, one decoder and
 * one bounded frame loop. Feature components own presentation and actions.
 */
export class UniversalScannerSession implements ScannerSession {
  readonly id = `scanner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  private currentState: ScannerLifecycleState = 'idle';
  private stream: MediaStream | null = null;
  private decoder: ScannerDecoderAdapter | null = null;
  private frameHandle: number | null = null;
  private frameKind: 'video' | 'raf' | null = null;
  private generation = 0;
  private decoding = false;
  private lastAcceptedAt = 0;
  private acceptedSingle = false;
  private disposed = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly options: ScannerOpenOptions,
  ) {}

  get state(): ScannerLifecycleState { return this.currentState; }

  private setState(state: ScannerLifecycleState): void {
    this.currentState = state;
    this.options.onStateChange?.(state);
  }

  async start(): Promise<void> {
    if (this.disposed || this.currentState === 'scanning' || this.currentState === 'requesting') return;
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
      this.video.srcObject = stream;
      this.video.muted = true;
      this.video.playsInline = true;
      await this.video.play();
      if (this.disposed || generation !== this.generation) return;

      this.setState('initializing');
      this.decoder = await this.createDecoder();
      if (this.disposed || generation !== this.generation) {
        await this.decoder.dispose();
        this.decoder = null;
        return;
      }
      this.acceptedSingle = false;
      this.setState('scanning');
      this.scheduleNextFrame(generation);
    } catch (cause) {
      await this.teardown(true);
      if (!this.disposed && generation === this.generation) {
        const error = scannerError(cause);
        this.setState('error');
        this.options.onError?.(error);
      }
    }
  }

  private async createDecoder(): Promise<ScannerDecoderAdapter> {
    const native = new NativeBarcodeDetectorAdapter();
    try {
      await native.initialize({ formats: this.options.formats });
      return native;
    } catch {
      native.dispose();
      const fallback = new ZXingDecoderAdapter();
      await fallback.initialize({ formats: this.options.formats });
      return fallback;
    }
  }

  private scheduleNextFrame(generation: number): void {
    if (this.disposed || generation !== this.generation || this.currentState !== 'scanning') return;
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
        if (!isValidValue(result.value, result.symbology)) continue;
        if (this.options.mode === 'single' && this.acceptedSingle) break;
        if (this.options.mode === 'continuous' && now - this.lastAcceptedAt < (this.options.sameCodeCooldownMs ?? 700)) continue;
        this.acceptedSingle = true;
        this.lastAcceptedAt = now;
        this.options.onResult(result);
        if (this.options.mode === 'single') {
          await this.close();
          return;
        }
      }
    } catch (cause) {
      const error = { code: 'DECODER_FAILED' as const, message: cause instanceof Error ? cause.message : 'Lỗi giải mã barcode.', recoverable: true, cause };
      this.options.onError?.(error);
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
    const video = this.video as HTMLVideoElement & {
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    if (this.frameHandle !== null) {
      if (this.frameKind === 'video' && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(this.frameHandle);
      else if (this.frameKind === 'raf') window.cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle = null;
    this.frameKind = null;
    const decoder = this.decoder;
    this.decoder = null;
    if (decoder) await decoder.dispose();
    const stream = this.stream;
    this.stream = null;
    if (this.video.srcObject === stream) this.video.srcObject = null;
    if (release && stream) releaseCameraStream(stream);
    this.decoding = false;
  }
}
