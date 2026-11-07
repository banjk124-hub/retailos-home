import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { SUPPORTED_BARCODE_FORMATS, type ScannerSymbology } from '../contracts';
import type {
  DecoderInitOptions,
  DecoderOutput,
  ScannerDecoderAdapter,
} from './decoderAdapter';
import { rgbaToLuminance } from './rgbaToLuminance';
const FORMAT_MAP: Record<ScannerSymbology, BarcodeFormat> = {
  EAN_8: BarcodeFormat.EAN_8,
  EAN_13: BarcodeFormat.EAN_13,
  UPC_A: BarcodeFormat.UPC_A,
  UPC_E: BarcodeFormat.UPC_E,
  CODE_128: BarcodeFormat.CODE_128,
  CODE_39: BarcodeFormat.CODE_39,
  CODE_93: BarcodeFormat.CODE_93,
  ITF: BarcodeFormat.ITF,
  CODABAR: BarcodeFormat.CODABAR,
  QR_CODE: BarcodeFormat.QR_CODE,
  DATA_MATRIX: BarcodeFormat.DATA_MATRIX,
  PDF_417: BarcodeFormat.PDF_417,
  AZTEC: BarcodeFormat.AZTEC,
  RSS_14: BarcodeFormat.RSS_14,
  RSS_EXPANDED: BarcodeFormat.RSS_EXPANDED,
  MAXICODE: BarcodeFormat.MAXICODE,
  MICRO_QR_CODE: BarcodeFormat.MICRO_QR_CODE,
};

const MAX_FRAME_WIDTH = 1280;
const ROI_WIDTH_RATIO = 0.82;
const ROI_HEIGHT_RATIO = 0.66;
const ROI_UPSCALE = 1.5;
const REVERSE_FORMAT_MAP = new Map<BarcodeFormat, ScannerSymbology>(
  Object.entries(FORMAT_MAP).map(([symbology, format]) => [
    format,
    symbology as ScannerSymbology,
  ]),
);

type FrameDimensions = { width: number; height: number };

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
  const width = frame.videoWidth || frame.naturalWidth || frame.displayWidth || frame.width || 0;
  const height = frame.videoHeight || frame.naturalHeight || frame.displayHeight || frame.height || 0;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('ZXing received a frame with invalid dimensions.');
  }
  return { width, height };
}

type DecodeMiss = 'notFound' | 'checksum' | 'format';

function classifyDecodeError(error: unknown): DecodeMiss | null {
  const detail = error instanceof Error
    ? `${error.name} ${error.constructor.name} ${error.message}`.toLowerCase()
    : String(error).toLowerCase();
  if (detail.includes('notfoundexception')
    || detail.includes('no multiformat readers were able to detect the code')) return 'notFound';
  if (detail.includes('checksum')) return 'checksum';
  if (detail.includes('formatexception')) return 'format';
  return null;
}

/**
 * Multi-format ZXing adapter.
 *
 * It tries the complete frame first (so codes near the edge are not lost),
 * then an upscaled centered region matching the visual scan reticle. The
 * more expensive global-histogram fallback runs only on every third ROI pass
 * to limit mobile CPU use. Camera ownership and frame scheduling remain in
 * UniversalScannerSession.
 */
export class ZXingDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zxing-retail-ean-code128';
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
  private diagnosticRoiHits = 0;
  private lastFrameWidth = 0;
  private lastFrameHeight = 0;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    if (this.disposed) throw new Error('ZXing adapter has been disposed.');
    const requested = [...new Set(formats)];
    if (requested.length === 0) throw new Error('At least one barcode format must be requested.');
    const unsupported = requested.filter((format) => !(SUPPORTED_BARCODE_FORMATS as readonly string[]).includes(format));
    if (unsupported.length > 0) {
      throw new Error(`Unsupported retail barcode format(s): ${unsupported.join(', ')}.`);
    }
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, requested.map((format) => FORMAT_MAP[format]));
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a 2D canvas context for ZXing.');
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
    if (this.decoding) return [];
    this.decoding = true;
    const decodeStartedAt = performance.now();
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
      const fullFrameDrawStartedAt = performance.now();
      this.context.drawImage(source, 0, 0, width, height);
      this.recordStageCost('full_frame_draw', performance.now() - fullFrameDrawStartedAt);

      let output = this.decodeCurrentCanvas(timestamp, false);
      if (output) {
        this.diagnosticDecoded += 1;
        this.emitDiagnostics();
        return [output];
      }

      // The UI reticle is centered. A second pass over that region increases
      // effective barcode pixel density without excluding edge-positioned codes
      // from the first full-frame pass.
      const cropWidth = Math.max(1, Math.round(width * ROI_WIDTH_RATIO));
      const cropHeight = Math.max(1, Math.round(height * ROI_HEIGHT_RATIO));
      const sx = Math.round((width - cropWidth) / 2);
      const sy = Math.round((height - cropHeight) / 2);
      // Upscale the centered crop without changing its aspect ratio. Stretching
      // a wide barcode to the full frame distorts bar/space geometry and can
      // make ZXing fail on otherwise readable labels.
      const roiWidth = Math.max(1, Math.round(cropWidth * ROI_UPSCALE));
      const roiHeight = Math.max(1, Math.round(cropHeight * ROI_UPSCALE));
      this.canvas.width = roiWidth;
      this.canvas.height = roiHeight;
      const roiDrawStartedAt = performance.now();
      this.context.drawImage(
        source,
        sx / scale,
        sy / scale,
        cropWidth / scale,
        cropHeight / scale,
        0,
        0,
        roiWidth,
        roiHeight,
      );
      this.recordStageCost('roi_draw', performance.now() - roiDrawStartedAt);
      output = this.decodeCurrentCanvas(timestamp, this.diagnosticFrames % 3 === 0);
      if (output) {
        this.diagnosticDecoded += 1;
        this.diagnosticRoiHits += 1;
        this.emitDiagnostics();
        return [output];
      }
      this.emitDiagnostics();
      return [];
    } finally {
      const durationMs = performance.now() - decodeStartedAt;
      this.recordDecodeCost(durationMs);
      this.reader?.reset();
      this.decoding = false;
    }
  }

  private decodeCostStartedAt = 0;
  private decodeCostCount = 0;
  private decodeCostTotalMs = 0;
  private decodeCostMaxMs = 0;
  private stageCosts: Record<string, { count: number; totalMs: number; maxMs: number }> = {};

  private recordDecodeCost(durationMs: number): void {
    this.decodeCostCount += 1;
    this.decodeCostTotalMs += durationMs;
    this.decodeCostMaxMs = Math.max(this.decodeCostMaxMs, durationMs);
    if (!this.decodeCostStartedAt) this.decodeCostStartedAt = Date.now();
    if (Date.now() - this.decodeCostStartedAt < 5_000) return;
    const stageCosts = Object.fromEntries(Object.entries(this.stageCosts).map(([stage, value]) => [stage, {
      samples: value.count,
      averageMs: Number((value.totalMs / value.count).toFixed(2)),
      maxMs: Number(value.maxMs.toFixed(2)),
    }]));
    console.info('[RetailOS Scanner] Decoder processing cost', {
      decoder: this.id,
      averageDecodeMs: Number((this.decodeCostTotalMs / this.decodeCostCount).toFixed(1)),
      maxDecodeMs: Number(this.decodeCostMaxMs.toFixed(1)),
      samples: this.decodeCostCount,
      stages: stageCosts,
    });
    this.decodeCostStartedAt = Date.now();
    this.decodeCostCount = 0;
    this.decodeCostTotalMs = 0;
    this.decodeCostMaxMs = 0;
    this.stageCosts = {};
  }

  private recordStageCost(stage: string, durationMs: number): void {
    const current = this.stageCosts[stage] ?? { count: 0, totalMs: 0, maxMs: 0 };
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    this.stageCosts[stage] = current;
  }

  private decodeCurrentCanvas(timestamp: number, includeGlobalHistogram: boolean): DecoderOutput | null {
    if (!this.reader || !this.canvas || !this.context) return null;
    const imageReadStartedAt = performance.now();
    const image = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.recordStageCost('image_data_read', performance.now() - imageReadStartedAt);
    const grayscaleStartedAt = performance.now();
const grayscale = rgbaToLuminance(
  image.data,
  this.canvas.width,
  this.canvas.height,
);
const luminance = new RGBLuminanceSource(
  grayscale,
  this.canvas.width,
  this.canvas.height,
);
    const binarizers = includeGlobalHistogram
      ? [HybridBinarizer, GlobalHistogramBinarizer]
      : [HybridBinarizer];

    for (const Binarizer of binarizers) {
      try {
        const bitmap = new BinaryBitmap(new Binarizer(luminance));
        // decode() resets the configured hints when no hints argument is passed.
        // Reuse the initialized retail-format whitelist across camera frames.
        const zxingStartedAt = performance.now();
        const result = this.reader.decodeWithState(bitmap);
        this.recordStageCost('zxing_decode', performance.now() - zxingStartedAt);
        const symbology = REVERSE_FORMAT_MAP.get(result.getBarcodeFormat());
        const value = result.getText();
        if (!symbology || !this.formats.includes(symbology) || value.length === 0) return null;
        return { value, symbology, timestamp, decoder: { id: this.id } };
      } catch (error) {
        const miss = classifyDecodeError(error);
        if (!miss) {
          this.diagnosticUnexpected += 1;
          const now = Date.now();
          if (now - this.lastUnexpectedErrorLogAt >= 5_000) {
            this.lastUnexpectedErrorLogAt = now;
            console.warn('[RetailOS Scanner] Unexpected ZXing decode failure:', error);
          }
          throw error;
        }
        if (miss === 'notFound') this.diagnosticNotFound += 1;
        else if (miss === 'checksum') this.diagnosticChecksum += 1;
        else this.diagnosticFormat += 1;
      } finally {
        this.reader.reset();
      }
    }
    return null;
  }

  private emitDiagnostics(): void {
    const now = Date.now();
    if (now - this.diagnosticStartedAt < 5_000) return;
    console.info('[RetailOS Scanner] Multi-format diagnostics', {
      decoder: this.id,
      frames: this.diagnosticFrames,
      decoded: this.diagnosticDecoded,
      roiHits: this.diagnosticRoiHits,
      notFound: this.diagnosticNotFound,
      checksumErrors: this.diagnosticChecksum,
      formatErrors: this.diagnosticFormat,
      unexpectedErrors: this.diagnosticUnexpected,
      sourceWidth: this.lastFrameWidth,
      sourceHeight: this.lastFrameHeight,
      averageDecodeMs: this.decodeCostCount ? Number((this.decodeCostTotalMs / this.decodeCostCount).toFixed(1)) : 0,
    });
    this.diagnosticStartedAt = now;
    this.diagnosticFrames = 0;
    this.diagnosticDecoded = 0;
    this.diagnosticNotFound = 0;
    this.diagnosticChecksum = 0;
    this.diagnosticFormat = 0;
    this.diagnosticUnexpected = 0;
    this.diagnosticRoiHits = 0;
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
