import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import type { ScannerSymbology } from '../contracts';
import type {
  DecoderInitOptions,
  DecoderOutput,
  ScannerDecoderAdapter,
} from './decoderAdapter';

const FORMAT_MAP: Record<ScannerSymbology, BarcodeFormat> = {
  EAN_8: BarcodeFormat.EAN_8,
  EAN_13: BarcodeFormat.EAN_13,
  CODE_128: BarcodeFormat.CODE_128,
};

const MAX_FRAME_WIDTH = 1280;
const REVERSE_FORMAT_MAP = new Map<BarcodeFormat, ScannerSymbology>(
  Object.entries(FORMAT_MAP).map(([symbology, format]) => [
    format,
    symbology as ScannerSymbology,
  ]),
);

type FrameDimensions = {
  width: number;
  height: number;
};

function getFrameDimensions(source: CanvasImageSource): FrameDimensions {
  const frame = source as CanvasImageSource & {
    videoWidth?: number;
    videoHeight?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
    width?: number;
    height?: number;
  };

  const width = frame.videoWidth
    || frame.naturalWidth
    || frame.displayWidth
    || frame.width
    || 0;
  const height = frame.videoHeight
    || frame.naturalHeight
    || frame.displayHeight
    || frame.height
    || 0;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('ZXing received a frame with invalid dimensions.');
  }

  return { width, height };
}

/**
 * ZXing decoder-only adapter.
 *
 * Frames are copied into a private canvas and decoded synchronously. This
 * adapter never requests camera permission, attaches a stream, or schedules
 * frame processing. Geometry is omitted because ZXing result points do not
 * provide a reliable barcode bounding box for this normalized contract.
 */
export class ZXingDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zxing';
  private reader: MultiFormatReader | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private formats: ScannerSymbology[] = [];
  private decoding = false;
  private disposed = false;
  private lastUnexpectedErrorLogAt = 0;
  private diagnosticStartedAt = Date.now();
  private diagnosticFrames = 0;
  private diagnosticDecoded = 0;
  private diagnosticNotFound = 0;
  private diagnosticChecksum = 0;
  private diagnosticFormat = 0;
  private diagnosticUnexpected = 0;
  private lastFrameWidth = 0;
  private lastFrameHeight = 0;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    if (this.disposed) throw new Error('ZXing adapter has been disposed.');
    const requested = [...new Set(formats)];
    if (requested.length === 0) {
      throw new Error('At least one barcode format must be requested.');
    }

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, requested.map((format) => FORMAT_MAP[format]));
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Unable to create a 2D canvas context for ZXing.');
    }

    this.reader = new MultiFormatReader();
    this.reader.setHints(hints as Map<DecodeHintType, any>);
    this.canvas = canvas;
    this.context = context;
    this.formats = requested;
  }

  async decode(
    source: CanvasImageSource,
    timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now(),
  ): Promise<DecoderOutput[]> {
    if (this.disposed || !this.reader || !this.canvas || !this.context) {
      throw new Error('ZXing adapter has not been initialized.');
    }

    // Do not queue stale frames if a caller accidentally overlaps decode calls.
    if (this.decoding) return [];

    this.decoding = true;
    try {
      const dimensions = getFrameDimensions(source);
      this.lastFrameWidth = dimensions.width;
      this.lastFrameHeight = dimensions.height;
      this.diagnosticFrames += 1;
      const scale = Math.min(1, MAX_FRAME_WIDTH / dimensions.width);
      const width = Math.max(1, Math.round(dimensions.width * scale));
      const height = Math.max(1, Math.round(dimensions.height * scale));
      this.canvas.width = width;
      this.canvas.height = height;
      this.context.drawImage(source, 0, 0, width, height);

      const image = this.context.getImageData(0, 0, width, height);
      const luminance = new RGBLuminanceSource(image.data, width, height);
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));

      try {
        const result = this.reader.decode(bitmap);
        const symbology = REVERSE_FORMAT_MAP.get(result.getBarcodeFormat());
        const value = result.getText();

        if (!symbology || !this.formats.includes(symbology) || value.length === 0) {
          return [];
        }

        this.diagnosticDecoded += 1;
        this.emitDiagnostics();
        return [{
          value,
          symbology,
          timestamp,
          decoder: { id: this.id },
        }];
      } catch (error) {
        // Normal misses are expected for video frames without a readable code.
        // Unexpected failures are rate-limited so a broken decoder is observable.
        // ZXing's exception name is not stable across package builds. In some
        // builds a normal NotFoundException is surfaced as a generic Error with
        // this message. Classify by both identity and message so an ordinary
        // frame without a barcode never escapes into the camera error UI.
        const detail = error instanceof Error
          ? `${error.name} ${error.constructor.name} ${error.message}`.toLowerCase()
          : String(error).toLowerCase();
        const missKind = detail.includes('notfoundexception')
          || detail.includes('no multiformat readers were able to detect the code')
          ? 'notFound'
          : detail.includes('checksum')
            ? 'checksum'
            : detail.includes('formatexception')
              ? 'format'
              : null;
        if (missKind === 'notFound') this.diagnosticNotFound += 1;
        else if (missKind === 'checksum') this.diagnosticChecksum += 1;
        else if (missKind === 'format') this.diagnosticFormat += 1;
        else {
          this.diagnosticUnexpected += 1;
          const now = Date.now();
          if (now - this.lastUnexpectedErrorLogAt >= 5_000) {
            this.lastUnexpectedErrorLogAt = now;
            console.warn('[RetailOS Scanner] Unexpected ZXing decode failure:', error);
          }
        }
        this.emitDiagnostics();
        if (!missKind) throw error;
        return [];
      } finally {
        this.reader.reset();
      }
    } finally {
      this.decoding = false;
    }
  }

  private emitDiagnostics(): void {
    const now = Date.now();
    if (now - this.diagnosticStartedAt < 5_000) return;
    console.info('[RetailOS Scanner] ZXing decoder diagnostics', {
      decoder: this.id,
      frames: this.diagnosticFrames,
      decoded: this.diagnosticDecoded,
      notFound: this.diagnosticNotFound,
      checksumErrors: this.diagnosticChecksum,
      formatErrors: this.diagnosticFormat,
      unexpectedErrors: this.diagnosticUnexpected,
      sourceWidth: this.lastFrameWidth,
      sourceHeight: this.lastFrameHeight,
    });
    this.diagnosticStartedAt = now;
    this.diagnosticFrames = 0;
    this.diagnosticDecoded = 0;
    this.diagnosticNotFound = 0;
    this.diagnosticChecksum = 0;
    this.diagnosticFormat = 0;
    this.diagnosticUnexpected = 0;
  }

  dispose(): void {
    this.disposed = true;
    this.reader?.reset();
    this.reader = null;
    this.context = null;
    this.canvas = null;
    this.formats = [];
    this.decoding = false;
  }
}
