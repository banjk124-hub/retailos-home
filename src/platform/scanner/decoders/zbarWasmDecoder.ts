import { scanImageData } from '@undecaf/zbar-wasm';
import type { ScannerSymbology } from '../contracts';
import type { DecoderInitOptions, DecoderOutput, ScannerDecoderAdapter } from './decoderAdapter';

const TYPE_MAP: Record<string, ScannerSymbology> = {
  EAN8: 'EAN_8',
  GTIN8: 'EAN_8',
  EAN13: 'EAN_13',
  GTIN13: 'EAN_13',
  CODE128: 'CODE_128',
};

const MAX_FRAME_WIDTH = 1280;
const UNKNOWN_TYPE_LOG_INTERVAL_MS = 10_000;

type ZBarSymbol = { typeName?: string; decode(): string };

function normalizeTypeName(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

/** ZBar WASM decoder. Camera ownership and frame scheduling stay in the session. */
export class ZBarWasmDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zbar-wasm';
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private formats: ScannerSymbology[] = [];
  private decoding = false;
  private lastUnknownTypeLogAt = 0;
  private disposed = false;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    if (this.disposed) throw new Error('ZBar adapter has been disposed.');
    const requested = [...new Set(formats)];
    if (requested.length === 0) throw new Error('At least one barcode format must be requested.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a 2D canvas context for ZBar.');
    // Warm up WASM before the camera enters its scanning state.
    await scanImageData(context.createImageData(1, 1));
    if (this.disposed) return;
    this.canvas = canvas;
    this.context = context;
    this.formats = requested;
  }

  async decode(
    source: CanvasImageSource,
    timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now(),
  ): Promise<DecoderOutput[]> {
    const canvas = this.canvas;
    const context = this.context;
    if (this.disposed || !canvas || !context) throw new Error('ZBar WASM adapter has not been initialized.');
    if (this.decoding) return [];
    this.decoding = true;
    try {
      const frame = source as CanvasImageSource & {
        videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number;
        displayWidth?: number; displayHeight?: number; width?: number; height?: number;
      };
      const sourceWidth = frame.videoWidth || frame.naturalWidth || frame.displayWidth || frame.width || 0;
      const sourceHeight = frame.videoHeight || frame.naturalHeight || frame.displayHeight || frame.height || 0;
      if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) return [];

      const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      canvas.width = width;
      canvas.height = height;
      context.drawImage(source, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const symbols = await scanImageData(imageData) as ZBarSymbol[];
      if (this.disposed) return [];

      return symbols.flatMap((symbol): DecoderOutput[] => {
        const typeName = normalizeTypeName(symbol.typeName);
        const symbology = TYPE_MAP[typeName];
        if (!symbology) {
          const now = Date.now();
          if (typeName && now - this.lastUnknownTypeLogAt >= UNKNOWN_TYPE_LOG_INTERVAL_MS) {
            this.lastUnknownTypeLogAt = now;
            console.warn('[RetailOS Scanner] ZBar returned an unsupported symbol type:', typeName);
          }
          return [];
        }
        if (!this.formats.includes(symbology)) return [];
        let value: string;
        try {
          value = symbol.decode();
        } catch (error) {
          console.warn('[RetailOS Scanner] ZBar symbol decode failed:', error);
          return [];
        }
        if (typeof value !== 'string' || value.trim().length === 0) return [];
        return [{
          value: value.trim(),
          symbology,
          timestamp,
          decoder: { id: this.id, version: '0.11.0' },
        }];
      });
    } finally {
      this.decoding = false;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.canvas = null;
    this.context = null;
    this.formats = [];
  }
}