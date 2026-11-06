import type { ScannerSymbology } from '../contracts';
import type {
  DecoderInitOptions,
  DecoderOutput,
  ScannerDecoderAdapter,
} from './decoderAdapter';

type NativeFormat = 'ean_8' | 'ean_13' | 'code_128';

type NativeBarcode = {
  rawValue?: string;
  format?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cornerPoints?: Array<{ x: number; y: number }>;
};

type NativeDetector = {
  detect(source: CanvasImageSource): Promise<NativeBarcode[]>;
};

type NativeDetectorConstructor = {
  new(options?: { formats?: NativeFormat[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
};

const FORMAT_MAP: Record<ScannerSymbology, NativeFormat> = {
  EAN_8: 'ean_8',
  EAN_13: 'ean_13',
  CODE_128: 'code_128',
};

const REVERSE_FORMAT_MAP: Record<NativeFormat, ScannerSymbology> = {
  ean_8: 'EAN_8',
  ean_13: 'EAN_13',
  code_128: 'CODE_128',
};

function getNativeConstructor(): NativeDetectorConstructor | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return (globalThis as typeof globalThis & {
    BarcodeDetector?: NativeDetectorConstructor;
  }).BarcodeDetector;
}

/**
 * Optional browser-native decoder. It is enabled only when every requested
 * format is explicitly reported by the current browser implementation.
 */
export class NativeBarcodeDetectorAdapter implements ScannerDecoderAdapter {
  readonly id = 'native-barcode-detector';
  private detector: NativeDetector | null = null;
  private formats: ScannerSymbology[] = [];

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    const Constructor = getNativeConstructor();
    if (!Constructor) {
      throw new Error('Native BarcodeDetector is not available in this browser.');
    }

    const supported = await Constructor.getSupportedFormats();
    const requested = [...new Set(formats)];
    const unsupported = requested.filter((format) => !supported.includes(FORMAT_MAP[format]));

    if (requested.length === 0 || unsupported.length > 0) {
      throw new Error(
        unsupported.length > 0
          ? `Native BarcodeDetector does not support: ${unsupported.join(', ')}`
          : 'At least one barcode format must be requested.',
      );
    }

    this.formats = requested;
    this.detector = new Constructor({
      formats: requested.map((format) => FORMAT_MAP[format]),
    });
  }

  async decode(source: CanvasImageSource, timestamp = performance.now()): Promise<DecoderOutput[]> {
    if (!this.detector) {
      throw new Error('Native BarcodeDetector adapter has not been initialized.');
    }

    const detections = await this.detector.detect(source);
    const frame = source as CanvasImageSource & {
      videoWidth?: number;
      videoHeight?: number;
      width?: number;
      height?: number;
    };
    const frameWidth = frame.videoWidth ?? frame.width ?? 0;
    const frameHeight = frame.videoHeight ?? frame.height ?? 0;

    return detections.flatMap((detection): DecoderOutput[] => {
      const symbology = detection.format
        ? REVERSE_FORMAT_MAP[detection.format as NativeFormat]
        : undefined;
      const value = detection.rawValue ?? '';

      if (!symbology || !this.formats.includes(symbology) || value.length === 0) {
        return [];
      }

      const box = detection.boundingBox;
      const geometry = box && frameWidth > 0 && frameHeight > 0
        ? {
          coordinateSpace: 'source-frame-pixels' as const,
          frameWidth,
          frameHeight,
          boundingBox: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          ...(detection.cornerPoints?.length
            ? { cornerPoints: detection.cornerPoints.map(({ x, y }) => ({ x, y })) }
            : {}),
        }
        : undefined;

      return [{
        value,
        symbology,
        ...(geometry ? { geometry } : {}),
        timestamp,
        decoder: { id: this.id },
      }];
    });
  }

  dispose(): void {
    // BarcodeDetector currently exposes no explicit native resource disposal.
    this.detector = null;
    this.formats = [];
  }
}
