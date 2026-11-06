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

  initialize({ formats }: DecoderInitOptions): void {
    const requested = [...new Set(formats)];
    if (requested.length === 0) {
      throw new Error('At least one barcode format must be requested.');
    }

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(
      DecodeHintType.POSSIBLE_FORMATS,
      requested.map((format) => FORMAT_MAP[format]),
    );

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
    if (!this.reader || !this.canvas || !this.context) {
      throw new Error('ZXing adapter has not been initialized.');
    }

    // Do not queue stale frames if a caller accidentally overlaps decode calls.
    if (this.decoding) return [];

    this.decoding = true;
    try {
      const { width, height } = getFrameDimensions(source);
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

        return [{
          value,
          symbology,
          timestamp,
          decoder: { id: this.id },
        }];
      } catch {
        // NotFound / checksum / format exceptions are expected for ordinary
        // video frames that do not contain a readable supported barcode.
        return [];
      } finally {
        this.reader.reset();
      }
    } finally {
      this.decoding = false;
    }
  }

  dispose(): void {
    this.reader?.reset();
    this.reader = null;
    this.context = null;
    this.canvas = null;
    this.formats = [];
    this.decoding = false;
  }
}
