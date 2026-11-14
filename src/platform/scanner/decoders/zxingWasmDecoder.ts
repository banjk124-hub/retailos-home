import { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION, type ReaderOptions } from 'zxing-wasm/reader';
import readerWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { SUPPORTED_BARCODE_FORMATS, type ScannerSymbology } from '../contracts';
import { resolveScannerRoiCrop } from '../scannerRoi';
import { resolveScannerRoiBaseDimensions, resolveScannerRoiScaleCandidates } from '../scannerScale';
import { measureScannerFocusQuality } from '../scannerFocusQuality';
import { createScannerTemporalSnapshot, type ScannerTemporalSnapshot } from '../scannerTemporalRecognition';
import { measureScannerImageQuality } from '../scannerImageEnhancement';
import { executeScannerEnhancementPipelineAsync, type ScannerOrientationHints } from '../scannerEnhancementPipeline';
import { rgbaToLuminance } from './rgbaToLuminance';
import type { DecoderDecodeOptions, DecoderInitOptions, DecoderOutput, ScannerDecoderAdapter } from './decoderAdapter';

const FORMAT_MAP: Partial<Record<ScannerSymbology, string>> = {
  EAN_8: 'EAN8', EAN_13: 'EAN13', UPC_A: 'UPCA', UPC_E: 'UPCE',
  CODE_128: 'Code128', CODE_39: 'Code39', CODE_93: 'Code93',
  ITF: 'ITF', CODABAR: 'Codabar', QR_CODE: 'QRCode',
  DATA_MATRIX: 'DataMatrix', PDF_417: 'PDF417', AZTEC: 'Aztec',
  RSS_14: 'DataBar', RSS_EXPANDED: 'DataBarExp',
  MAXICODE: 'MaxiCode', MICRO_QR_CODE: 'MicroQRCode',
};
const REVERSE_FORMAT_MAP = new Map<string, ScannerSymbology>(
  Object.entries(FORMAT_MAP).map(([key, value]) => [value, key as ScannerSymbology]),
);
// ZXing-C++ can report concrete variants for family-level formats.
for (const variant of ['Code39Std', 'Code39Ext']) REVERSE_FORMAT_MAP.set(variant, 'CODE_39');
for (const variant of ['ITF14']) REVERSE_FORMAT_MAP.set(variant, 'ITF');
for (const variant of ['CompactPDF417', 'MicroPDF417']) REVERSE_FORMAT_MAP.set(variant, 'PDF_417');
for (const variant of ['QRCodeModel1', 'QRCodeModel2']) REVERSE_FORMAT_MAP.set(variant, 'QR_CODE');
for (const variant of ['AztecCode', 'AztecRune']) REVERSE_FORMAT_MAP.set(variant, 'AZTEC');
for (const variant of ['DataBarOmni', 'DataBarStk', 'DataBarStkOmni']) REVERSE_FORMAT_MAP.set(variant, 'RSS_14');
for (const variant of ['DataBarExpStk']) REVERSE_FORMAT_MAP.set(variant, 'RSS_EXPANDED');
const WASM_OVERRIDES = {
  locateFile(path: string, prefix: string): string {
    return path.endsWith('.wasm') ? readerWasmUrl : `${prefix}${path}`;
  },
};
let wasmReady: Promise<unknown> | null = null;
function ensureWasmReady(): Promise<unknown> {
  if (!wasmReady) {
    wasmReady = prepareZXingModule({ overrides: WASM_OVERRIDES, fireImmediately: true })
      .catch((error: unknown) => { wasmReady = null; throw error; });
  }
  return wasmReady;
}
function frameDimensions(source: CanvasImageSource): { width: number; height: number } {
  const frame = source as CanvasImageSource & { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; displayWidth?: number; displayHeight?: number; width?: number; height?: number };
  const width = frame.videoWidth || frame.naturalWidth || frame.displayWidth || frame.width || 0;
  const height = frame.videoHeight || frame.naturalHeight || frame.displayHeight || frame.height || 0;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('ZXing-C++ received invalid frame dimensions.');
  }
  return { width, height };
}
function readerOptions(formats: ScannerSymbology[]): ReaderOptions {
  return {
    formats: formats.map((format) => FORMAT_MAP[format]).filter((value): value is string => Boolean(value)) as NonNullable<ReaderOptions['formats']>,
    tryHarder: true, tryRotate: false, tryInvert: false, tryDownscale: false, tryDenoise: false,
    maxNumberOfSymbols: 1, validateOptionalChecksum: true, characterSet: 'UTF8',
  };
}

export class ZXingWasmDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zxing-cpp-wasm-candidate';
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private formats: ScannerSymbology[] = [];
  private options: ReaderOptions | null = null;
  private decoding = false;
  private disposed = false;
  private lastFocusAt = 0;
  private previousFocusPixels: Uint8Array | null = null;
  private previousFocusKey: string | null = null;
  private previousFocusWidth = 0;
  private previousFocusHeight = 0;
  private cachedOrientationHints: ScannerOrientationHints | null = null;

  async initialize({ formats }: DecoderInitOptions): Promise<void> {
    if (this.disposed) throw new Error('ZXing-C++ adapter has been disposed.');
    const requested = [...new Set(formats)];
    const unsupported = requested.filter((format) =>
      !(SUPPORTED_BARCODE_FORMATS as readonly string[]).includes(format) || !FORMAT_MAP[format],
    );
    if (!requested.length || unsupported.length) {
      throw new Error(`Unsupported or empty barcode format allowlist: ${unsupported.join(', ')}.`);
    }
    await ensureWasmReady();
    if (this.disposed) throw new Error('ZXing-C++ adapter was disposed during initialization.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a 2D canvas context for ZXing-C++.');
    this.canvas = canvas;
    this.context = context;
    this.formats = requested;
    this.options = readerOptions(requested);
  }

  async decode(source: CanvasImageSource, options: DecoderDecodeOptions): Promise<DecoderOutput[]> {
    if (this.disposed || !this.canvas || !this.context || !this.options) {
      throw new Error('ZXing-C++ adapter has not been initialized.');
    }
    if (this.decoding) return [];
    this.decoding = true;
    const timestamp = options.timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      const dimensions = frameDimensions(source);
      const crop = resolveScannerRoiCrop(options.scanRegion, dimensions.width, dimensions.height);
      if (!crop) return [];
      const base = resolveScannerRoiBaseDimensions(crop.width, crop.height);
      if (!base) return [];

      for (const scale of resolveScannerRoiScaleCandidates(base.width, base.height)) {
        if (this.disposed || !this.canvas || !this.context || !this.options) return [];
        this.canvas.width = scale.width;
        this.canvas.height = scale.height;
        this.context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, scale.width, scale.height);
        const image = this.context.getImageData(0, 0, scale.width, scale.height);
        const grayscale = rgbaToLuminance(image.data, scale.width, scale.height);

        let sampledQuality = undefined as ReturnType<typeof measureScannerImageQuality> | undefined;
        if (scale.baseline && options.onFocusQuality && timestamp - this.lastFocusAt >= 500) {
          this.lastFocusAt = timestamp;
          const regionKey = `${dimensions.width}x${dimensions.height}:${crop.x},${crop.y},${crop.width},${crop.height}`;
          const sameGeometry = this.previousFocusKey === regionKey
            && this.previousFocusWidth === scale.width
            && this.previousFocusHeight === scale.height;
          const focus = measureScannerFocusQuality(
            grayscale, scale.width, scale.height,
            sameGeometry ? this.previousFocusPixels : null,
          );
          this.previousFocusPixels = focus.sampledPixels;
          this.previousFocusKey = regionKey;
          this.previousFocusWidth = scale.width;
          this.previousFocusHeight = scale.height;
          options.onFocusQuality(focus);
          sampledQuality = measureScannerImageQuality({ luminance: grayscale, width: scale.width, height: scale.height });
          if (focus.valid && options.onTemporalFrame) {
            const snapshot = createScannerTemporalSnapshot(grayscale, scale.width, scale.height);
            if (snapshot) options.onTemporalFrame(snapshot, focus);
          }
        }

        const pipelineResult = await executeScannerEnhancementPipelineAsync(
          { luminance: grayscale, width: scale.width, height: scale.height },
          {
            cachedOrientationHints: this.cachedOrientationHints,
            reuseOrientationHints: !scale.baseline,
            imageQuality: sampledQuality,
            processingBudget: options.processingBudget,
            shouldContinue: () => !this.disposed,
          },
          (candidate) => this.decodeLuminance(candidate.luminance, candidate.width, candidate.height, timestamp),
        );
        this.cachedOrientationHints = pipelineResult.orientationHints;
        if (this.disposed) return [];
        if (pipelineResult.output) return [pipelineResult.output];
      }
      return [];
    } finally {
      this.decoding = false;
    }
  }

  async decodeTemporalSnapshot(
    snapshot: ScannerTemporalSnapshot,
    timestamp: number,
    processingBudget?: import('../scannerAdaptiveRuntimeController').ScannerAdaptiveRuntimeBudget,
  ): Promise<DecoderOutput[]> {
    if (this.disposed || !this.options || !Number.isFinite(timestamp)
      || !(snapshot.pixels instanceof Uint8Array) || !Number.isSafeInteger(snapshot.width) || !Number.isSafeInteger(snapshot.height)
      || snapshot.width < 1 || snapshot.height < 1 || snapshot.pixels.length !== snapshot.width * snapshot.height
      || snapshot.pixels.length > 640 * 360 || this.decoding) return [];
    this.decoding = true;
    try {
      const pipelineResult = await executeScannerEnhancementPipelineAsync(
        { luminance: new Uint8ClampedArray(snapshot.pixels), width: snapshot.width, height: snapshot.height },
        {
          cachedOrientationHints: this.cachedOrientationHints,
          reuseOrientationHints: true,
          processingBudget,
          shouldContinue: () => !this.disposed,
        },
        (candidate) => this.decodeLuminance(candidate.luminance, candidate.width, candidate.height, timestamp),
      );
      this.cachedOrientationHints = pipelineResult.orientationHints;
      if (this.disposed || !pipelineResult.output) return [];
      return [pipelineResult.output];
    } finally {
      this.decoding = false;
    }
  }

  private async decodeLuminance(
    luminance: Uint8ClampedArray,
    width: number,
    height: number,
    timestamp: number,
  ): Promise<DecoderOutput | null> {
    if (this.disposed || !this.options || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
      || width < 1 || height < 1 || luminance.length !== width * height
      || luminance.length > 1_500_000) return null;
    const rgba = new Uint8ClampedArray(luminance.length * 4);
    for (let index = 0; index < luminance.length; index += 1) {
      const value = luminance[index], offset = index * 4;
      rgba[offset] = value; rgba[offset + 1] = value; rgba[offset + 2] = value; rgba[offset + 3] = 255;
    }
    const results = await readBarcodes(new ImageData(rgba, width, height), this.options);
    if (this.disposed) return null;
    return this.toOutput(results, timestamp);
  }

  private toOutput(results: Awaited<ReturnType<typeof readBarcodes>>, timestamp: number): DecoderOutput | null {
    for (const result of results) {
      const symbology = REVERSE_FORMAT_MAP.get(String(result.format));
      if (!symbology || !this.formats.includes(symbology) || typeof result.text !== 'string' || !result.text.length) continue;
      return { value: result.text, symbology, timestamp, decoder: { id: this.id, version: String(ZXING_WASM_VERSION) } };
    }
    return null;
  }

  dispose(): void {
    this.disposed = true;
    this.canvas = null;
    this.context = null;
    this.formats = [];
    this.options = null;
    this.previousFocusPixels = null;
    this.previousFocusKey = null;
    this.previousFocusWidth = 0;
    this.previousFocusHeight = 0;
    this.cachedOrientationHints = null;
  }
}
