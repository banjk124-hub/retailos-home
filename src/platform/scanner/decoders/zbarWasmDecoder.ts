import { scanImageData } from '@undecaf/zbar-wasm';
import type { ScannerSymbology } from '../contracts';
import type {
  DecoderInitOptions,
  DecoderOutput,
  ScannerDecoderAdapter,
} from './decoderAdapter';

const TYPE_MAP: Record<string, ScannerSymbology> = {
  EAN8: 'EAN_8',
  EAN13: 'EAN_13',
  GTIN8: 'EAN_8',
  GTIN13: 'EAN_13',
  CODE128: 'CODE_128',
};

const MAX_FRAME_WIDTH = 960;

type ZBarSymbol = {
  typeName: string;
  decode(): string;
};

/** ZBar WebAssembly decoder. Camera ownership and frame scheduling stay in the session. */
export class ZBarWasmDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zbar-wasm';
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private formats: ScannerSymbology[] = [];
  private decoding = false;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    const requested = [...new Set(formats)];
    if (requested.length === 0) throw new Error('At least one barcode format must be requested.');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a 2D canvas context for ZBar.');

    // Trigger WASM initialization during scanner startup, not on the first barcode frame.
    await scanImageData(context.createImageData(1, 1));
    this.canvas = canvas;
    this.context = context;
    this.formats = requested;
  }

  async decode(
    source: CanvasImageSource,
    timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now(),
  ): Promise<DecoderOutput[]> {
    if (!this.canvas || !this.context) throw new Error('ZBar WASM adapter has not been initialized.');
    if (this.decoding) return [];

    this.decoding = true;
    try {
      const frame = source as CanvasImageSource & {
        videoWidth?: number;
        videoHeight?: number;
        naturalWidth?: number;
        naturalHeight?: number;
        width?: number;
        height?: number;
      };
      const sourceWidth = frame.videoWidth || frame.naturalWidth || frame.width || 0;
      const sourceHeight = frame.videoHeight || frame.naturalHeight || frame.height || 0;
      if (sourceWidth <= 0 || sourceHeight <= 0) return [];

      const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      this.canvas.width = width;
      this.canvas.height = height;
      this.context.drawImage(source, 0, 0, width, height);

      const symbols = await scanImageData(this.context.getImageData(0, 0, width, height)) as ZBarSymbol[];
      return symbols.flatMap((symbol): DecoderOutput[] => {
        const key = symbol.typeName.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const symbology = TYPE_MAP[key];
        if (!symbology || !this.formats.includes(symbology)) return [];
        const value = symbol.decode();
        if (!value) return [];
        return [{
          value,
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
    this.canvas = null;
    this.context = null;
    this.formats = [];
    this.decoding = false;
  }
}
