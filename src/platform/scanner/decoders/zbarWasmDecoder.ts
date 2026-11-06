import { scanImageData } from '@undecaf/zbar-wasm';
import type { ScannerSymbology } from '../contracts';
import type { DecoderInitOptions, DecoderOutput, ScannerDecoderAdapter } from './decoderAdapter';

const TYPE_MAP: Record<string, ScannerSymbology> = {
  EAN8: 'EAN_8', GTIN8: 'EAN_8',
  EAN13: 'EAN_13', GTIN13: 'EAN_13',
  CODE128: 'CODE_128',
};
const MAX_FRAME_WIDTH = 1280;
const UNKNOWN_TYPE_LOG_INTERVAL_MS = 10_000;

type ZBarSymbol = { typeName?: string; decode(): string };
type WorkerSymbol = { typeName: string; value: string };
type WorkerResponse =
  | { type: 'ready'; id: number }
  | { type: 'result'; id: number; symbols: WorkerSymbol[] }
  | { type: 'error'; id: number; message: string };
type PendingWorkerRequest = {
  resolve: (symbols: WorkerSymbol[]) => void;
  reject: (error: Error) => void;
};

function normalizeTypeName(value: unknown): string {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

/** ZBar decoder: WASM runs in a module worker where supported, with a safe fallback. */
export class ZBarWasmDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zbar-wasm';
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private formats: ScannerSymbology[] = [];
  private decoding = false;
  private disposed = false;
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private pending = new Map<number, PendingWorkerRequest>();
  private lastUnknownTypeLogAt = 0;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    if (this.disposed) throw new Error('ZBar adapter has been disposed.');
    const requested = [...new Set(formats)];
    if (requested.length === 0) throw new Error('At least one barcode format must be requested.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a 2D canvas context for ZBar.');
    this.canvas = canvas;
    this.context = context;
    this.formats = requested;

    // Module workers keep WASM decoding away from the UI thread on modern iOS/Android.
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(new URL('./zbarWasm.worker.ts', import.meta.url), { type: 'module' });
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handleWorkerMessage(event.data);
        worker.onerror = (event) => {
          const error = new Error(event.message || 'ZBar worker failed.');
          this.failWorker(error);
        };
        await this.sendWorkerInit();
      } catch (error) {
        console.warn('[RetailOS Scanner] ZBar worker unavailable; using main-thread fallback:', error);
        this.terminateWorker();
        await scanImageData(context.createImageData(1, 1));
      }
    } else {
      await scanImageData(context.createImageData(1, 1));
    }
  }

  private sendWorkerInit(): Promise<void> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error('ZBar worker is unavailable.'));
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: () => resolve(),
        reject,
      });
      worker.postMessage({ type: 'init', id });
    });
  }

  private handleWorkerMessage(message: WorkerResponse): void {
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.type === 'error') pending.reject(new Error(message.message));
    else pending.resolve(message.type === 'result' ? message.symbols : []);
  }

  private failWorker(error: Error): void {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.terminateWorker();
  }

  private terminateWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private decodeInWorker(imageData: ImageData): Promise<WorkerSymbol[]> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error('ZBar worker is unavailable.'));
    const id = this.nextRequestId++;
    const buffer = imageData.data.buffer as ArrayBuffer;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({
        type: 'decode', id, width: imageData.width, height: imageData.height, buffer,
      }, [buffer]);
    });
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

      let symbols: WorkerSymbol[];
      if (this.worker) {
        try {
          symbols = await this.decodeInWorker(imageData);
        } catch (error) {
          console.warn('[RetailOS Scanner] ZBar worker decode failed; switching to main-thread fallback:', error);
          this.terminateWorker();
          const fallback = await scanImageData(context.getImageData(0, 0, width, height)) as ZBarSymbol[];
          symbols = fallback.map((symbol) => ({ typeName: symbol.typeName || '', value: symbol.decode() }));
        }
      } else {
        const decoded = await scanImageData(imageData) as ZBarSymbol[];
        symbols = decoded.map((symbol) => ({ typeName: symbol.typeName || '', value: symbol.decode() }));
      }
      if (this.disposed) return [];

      return symbols.flatMap((symbol): DecoderOutput[] => {
        const key = normalizeTypeName(symbol.typeName);
        const symbology = TYPE_MAP[key];
        if (!symbology) {
          const now = Date.now();
          if (key && now - this.lastUnknownTypeLogAt >= UNKNOWN_TYPE_LOG_INTERVAL_MS) {
            this.lastUnknownTypeLogAt = now;
            console.warn('[RetailOS Scanner] Unsupported ZBar symbol type:', symbol.typeName);
          }
          return [];
        }
        if (!this.formats.includes(symbology) || !symbol.value.trim()) return [];
        return [{
          value: symbol.value.trim(),
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
    this.terminateWorker();
    for (const request of this.pending.values()) request.reject(new Error('ZBar adapter disposed.'));
    this.pending.clear();
    this.canvas = null;
    this.context = null;
    this.formats = [];
  }
}