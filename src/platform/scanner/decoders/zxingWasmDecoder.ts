import { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION, type ReaderOptions } from 'zxing-wasm/reader';
import readerWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { SUPPORTED_BARCODE_FORMATS, type ScannerSymbology } from '../contracts';
import { resolveScannerRoiCrop } from '../scannerRoi';
import { resolveScannerRoiBaseDimensions, resolveScannerRoiScaleCandidates } from '../scannerScale';
import { measureScannerFocusQuality } from '../scannerFocusQuality';
import { createScannerTemporalSnapshot, type ScannerTemporalSnapshot } from '../scannerTemporalRecognition';
import { measureScannerImageQuality, type ScannerImageQuality } from '../scannerImageEnhancement';
import { createScannerImageQualityProfile, type ScannerImageQualityProfile } from '../scannerImageQualityProfile';
import type { ScannerAdaptiveProcessingPlan } from '../scannerAdaptiveProcessingController';
import { executeScannerEnhancementPipelineAsync, type ScannerOrientationHints, type ScannerEnhancementPipelineResult } from '../scannerEnhancementPipeline';
import { rgbaToLuminance } from './rgbaToLuminance';
import { createZXingWasmReaderOptions, type ZXingWasmBinarizer } from './zxingWasmOptions';
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

  private diagnosticStartedAt = Date.now();
  private diagnosticFrames = 0;
  private diagnosticDecoded = 0;
  private diagnosticNotFound = 0;
  private diagnosticChecksum = 0;
  private diagnosticFormat = 0;
  private diagnosticUnexpected = 0;
  private diagnosticRoiHits = 0;
  private diagnosticRoiUnavailable = 0;
  private diagnosticRotationAttempts = 0;
  private diagnosticRotationHits = 0;
  private diagnosticDeskewAttempts = 0;
  private diagnosticDeskewEstimateMisses = 0;
  private diagnosticDeskewHits = 0;
  private diagnosticGeometryAttempts = 0;
  private diagnosticGeometryHits = 0;
  private diagnosticLastGeometryTransform: string | null = null;
  private diagnosticScaleAttempts = 0;
  private diagnosticScaleHits = 0;
  private diagnosticLastScaleFactor = 0;
  private diagnosticLastDeskewAngleDegrees = 0;
  private lastImageQuality: ScannerImageQuality | null = null;
  private lastImageQualityProfile: ScannerImageQualityProfile | null = null;
  private lastAdaptiveProcessingPlan: ScannerAdaptiveProcessingPlan | null = null;
  private lastFrameWidth = 0;
  private lastFrameHeight = 0;
  private lastRoiWidth = 0;
  private lastRoiHeight = 0;
  private diagnosticRoiSourceScale = 1;

  private decodeCostStartedAt = 0;
  private decodeCostCount = 0;
  private decodeCostTotalMs = 0;
  private decodeCostMaxMs = 0;
  private stageCosts: Record<string, { count: number; totalMs: number; maxMs: number }> = {};

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
    this.options = createZXingWasmReaderOptions(
      requested.map((format) => FORMAT_MAP[format]).filter((value): value is string => Boolean(value)),
    );
  }

  async decode(source: CanvasImageSource, options: DecoderDecodeOptions): Promise<DecoderOutput[]> {
    if (this.disposed || !this.canvas || !this.context || !this.options) {
      throw new Error('ZXing-C++ adapter has not been initialized.');
    }
    if (this.decoding) return [];
    this.decoding = true;
    const decodeStartedAt = performance.now();
    const timestamp = options.timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      const dimensions = frameDimensions(source);
      this.lastFrameWidth = dimensions.width;
      this.lastFrameHeight = dimensions.height;
      const crop = resolveScannerRoiCrop(options.scanRegion, dimensions.width, dimensions.height);
      if (!crop) {
        this.diagnosticRoiUnavailable += 1;
        this.emitDiagnostics();
        return [];
      }
      const base = resolveScannerRoiBaseDimensions(crop.width, crop.height);
      if (!base) {
        this.diagnosticRoiUnavailable += 1;
        this.emitDiagnostics();
        return [];
      }

      this.diagnosticFrames += 1;
      this.lastRoiWidth = crop.width;
      this.lastRoiHeight = crop.height;
      this.diagnosticRoiSourceScale = base.sourceScale;

      for (const scale of resolveScannerRoiScaleCandidates(base.width, base.height)) {
        if (this.disposed || !this.canvas || !this.context || !this.options) return [];
        this.canvas.width = scale.width;
        this.canvas.height = scale.height;

        const roiDrawStartedAt = performance.now();
        this.context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, scale.width, scale.height);
        this.recordStageCost(
          scale.baseline ? 'roi_draw_baseline_1_5x' : 'roi_draw_multiscale',
          performance.now() - roiDrawStartedAt,
        );
        this.diagnosticScaleAttempts += 1;
        this.diagnosticLastScaleFactor = scale.scale;

        const imageReadStartedAt = performance.now();
        const image = this.context.getImageData(0, 0, scale.width, scale.height);
        this.recordStageCost('image_data_read', performance.now() - imageReadStartedAt);
        const grayscaleStartedAt = performance.now();
        const grayscale = rgbaToLuminance(image.data, scale.width, scale.height);
        this.recordStageCost('grayscale', performance.now() - grayscaleStartedAt);

        let sampledQuality: ScannerImageQuality | null | undefined;
        if (scale.baseline && options.onFocusQuality && timestamp - this.lastFocusAt >= 500) {
          this.lastFocusAt = timestamp;
          const regionKey = `${dimensions.width}x${dimensions.height}:${crop.x},${crop.y},${crop.width},${crop.height}`;
          const sameGeometry = this.previousFocusKey === regionKey
            && this.previousFocusWidth === scale.width
            && this.previousFocusHeight === scale.height;
          const focusStartedAt = performance.now();
          const focus = measureScannerFocusQuality(
            grayscale, scale.width, scale.height,
            sameGeometry ? this.previousFocusPixels : null,
          );
          this.recordStageCost('focus_quality', performance.now() - focusStartedAt);
          this.previousFocusPixels = focus.sampledPixels;
          this.previousFocusKey = regionKey;
          this.previousFocusWidth = scale.width;
          this.previousFocusHeight = scale.height;
          options.onFocusQuality(focus);

          const qualityStartedAt = performance.now();
          sampledQuality = measureScannerImageQuality({
            luminance: grayscale, width: scale.width, height: scale.height,
          });
          this.recordStageCost('image_quality', performance.now() - qualityStartedAt);
          this.lastImageQuality = sampledQuality;
          if (sampledQuality) {
            const profileStartedAt = performance.now();
            this.lastImageQualityProfile = createScannerImageQualityProfile({
              timestamp,
              frameWidth: dimensions.width,
              frameHeight: dimensions.height,
              roiX: crop.x,
              roiY: crop.y,
              roiWidth: crop.width,
              roiHeight: crop.height,
              sampleWidth: scale.width,
              sampleHeight: scale.height,
              focus,
              image: sampledQuality,
            });
            this.recordStageCost('quality_profile', performance.now() - profileStartedAt);
          } else {
            this.lastImageQualityProfile = null;
          }
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
            onImageQuality: (quality) => { this.lastImageQuality = quality; },
            onProcessingPlan: (plan) => { this.lastAdaptiveProcessingPlan = plan; },
            processingBudget: options.processingBudget,
            shouldContinue: () => !this.disposed,
          },
          (candidate) => this.decodeLuminance(candidate.luminance, candidate.width, candidate.height, timestamp),
          (stage, durationMs) => this.recordStageCost(stage, durationMs),
        );
        this.cachedOrientationHints = pipelineResult.orientationHints;
        this.recordPipelineDiagnostics(pipelineResult);
        if (this.disposed) return [];
        if (pipelineResult.output) {
          this.diagnosticScaleHits += 1;
          this.diagnosticDecoded += 1;
          this.diagnosticRoiHits += 1;
          this.emitDiagnostics();
          return [pipelineResult.output];
        }
      }
      this.emitDiagnostics();
      return [];
    } catch (error) {
      this.diagnosticUnexpected += 1;
      const now = Date.now();
      if (now - this.lastUnexpectedErrorLogAt >= 5_000) {
        this.lastUnexpectedErrorLogAt = now;
        console.warn('[RetailOS Scanner] Unexpected ZXing-C++ decode failure:', error);
      }
      throw error;
    } finally {
      this.recordDecodeCost(performance.now() - decodeStartedAt);
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
    const startedAt = performance.now();
    try {
      const pipelineResult = await executeScannerEnhancementPipelineAsync(
        { luminance: new Uint8ClampedArray(snapshot.pixels), width: snapshot.width, height: snapshot.height },
        {
          cachedOrientationHints: this.cachedOrientationHints,
          reuseOrientationHints: true,
          onImageQuality: (quality) => { this.lastImageQuality = quality; },
          onProcessingPlan: (plan) => { this.lastAdaptiveProcessingPlan = plan; },
          processingBudget,
          shouldContinue: () => !this.disposed,
        },
        (candidate) => this.decodeLuminance(candidate.luminance, candidate.width, candidate.height, timestamp),
        (stage, durationMs) => this.recordStageCost(stage, durationMs),
      );
      this.cachedOrientationHints = pipelineResult.orientationHints;
      this.recordPipelineDiagnostics(pipelineResult);
      if (this.disposed || !pipelineResult.output) return [];
      this.diagnosticDecoded += 1;
      this.diagnosticRoiHits += 1;
      return [pipelineResult.output];
    } catch (error) {
      this.diagnosticUnexpected += 1;
      throw error;
    } finally {
      this.recordStageCost('temporal_fallback_total', performance.now() - startedAt);
      this.emitDiagnostics();
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

    const rgbaStartedAt = performance.now();
    const rgba = new Uint8ClampedArray(luminance.length * 4);
    for (let index = 0; index < luminance.length; index += 1) {
      const value = luminance[index], offset = index * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
    this.recordStageCost('rgba_expand', performance.now() - rgbaStartedAt);

    // Match the legacy decoder's ordered binarizer policy:
    // HybridBinarizer-equivalent LocalAverage first, GlobalHistogram only on miss.
    const imageData = new ImageData(rgba, width, height);
    const binarizers: readonly ZXingWasmBinarizer[] = ['LocalAverage', 'GlobalHistogram'];
    for (const binarizer of binarizers) {
      if (this.disposed || !this.options) return null;
      const startedAt = performance.now();
      const results = await readBarcodes(
        imageData,
        createZXingWasmReaderOptions(this.options.formats ?? [], binarizer, this.options),
      );
      this.recordStageCost(
        binarizer === 'LocalAverage' ? 'zxing_decode_hybrid_equivalent' : 'zxing_decode_global_histogram',
        performance.now() - startedAt,
      );
      if (this.disposed) return null;
      const output = this.toOutput(results, timestamp);
      if (output) return output;
    }
    return null;
  }

  private toOutput(results: Awaited<ReturnType<typeof readBarcodes>>, timestamp: number): DecoderOutput | null {
    if (results.length === 0) this.diagnosticNotFound += 1;
    for (const result of results) {
      if (result.isValid === false || Boolean(result.error)) {
        const reason = String(result.error ?? '').toLowerCase();
        if (reason.includes('checksum')) this.diagnosticChecksum += 1;
        else if (reason.includes('format')) this.diagnosticFormat += 1;
        else this.diagnosticFormat += 1;
        continue;
      }
      const symbology = REVERSE_FORMAT_MAP.get(String(result.format));
      if (!symbology || !this.formats.includes(symbology)
        || typeof result.text !== 'string' || !result.text.length) continue;
      return {
        value: result.text,
        symbology,
        timestamp,
        decoder: { id: this.id, version: String(ZXING_WASM_VERSION) },
      };
    }
    return null;
  }

  private recordPipelineDiagnostics(result: ScannerEnhancementPipelineResult<DecoderOutput>): void {
    if (result.rotationAttempted) this.diagnosticRotationAttempts += 1;
    if (result.matchedStage === 'orthogonal') this.diagnosticRotationHits += 1;
    this.diagnosticDeskewAttempts += result.deskewAttempts;
    this.diagnosticDeskewEstimateMisses += result.deskewEstimateMisses;
    if (result.lastDeskewAngleDegrees !== null) {
      this.diagnosticLastDeskewAngleDegrees = result.lastDeskewAngleDegrees;
    }
    if (result.matchedStage === 'deskew') this.diagnosticDeskewHits += 1;
    this.diagnosticGeometryAttempts += result.geometryCandidatesAttempted;
    if (result.matchedStage === 'geometry') {
      this.diagnosticGeometryHits += 1;
      this.diagnosticLastGeometryTransform = result.matchedTransform;
    }
  }

  private recordDecodeCost(durationMs: number): void {
    this.decodeCostCount += 1;
    this.decodeCostTotalMs += durationMs;
    this.decodeCostMaxMs = Math.max(this.decodeCostMaxMs, durationMs);
    if (!this.decodeCostStartedAt) this.decodeCostStartedAt = Date.now();
    if (Date.now() - this.decodeCostStartedAt < 5_000) return;
    const stages = Object.fromEntries(Object.entries(this.stageCosts).map(([stage, value]) => [stage, {
      samples: value.count,
      averageMs: Number((value.totalMs / value.count).toFixed(2)),
      maxMs: Number(value.maxMs.toFixed(2)),
    }]));
    console.info('[RetailOS Scanner] Decoder processing cost', {
      decoder: this.id,
      averageDecodeMs: Number((this.decodeCostTotalMs / this.decodeCostCount).toFixed(1)),
      maxDecodeMs: Number(this.decodeCostMaxMs.toFixed(1)),
      samples: this.decodeCostCount,
      stages,
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

  private emitDiagnostics(): void {
    const now = Date.now();
    if (now - this.diagnosticStartedAt < 5_000) return;
    console.info('[RetailOS Scanner] Multi-format diagnostics', {
      decoder: this.id,
      frames: this.diagnosticFrames,
      decoded: this.diagnosticDecoded,
      roiHits: this.diagnosticRoiHits,
      roiUnavailable: this.diagnosticRoiUnavailable,
      rotationAttempts: this.diagnosticRotationAttempts,
      rotationHits: this.diagnosticRotationHits,
      deskewAttempts: this.diagnosticDeskewAttempts,
      deskewEstimateMisses: this.diagnosticDeskewEstimateMisses,
      deskewHits: this.diagnosticDeskewHits,
      geometryAttempts: this.diagnosticGeometryAttempts,
      geometryHits: this.diagnosticGeometryHits,
      lastGeometryTransform: this.diagnosticLastGeometryTransform,
      scaleAttempts: this.diagnosticScaleAttempts,
      scaleHits: this.diagnosticScaleHits,
      lastScaleFactor: Number(this.diagnosticLastScaleFactor.toFixed(2)),
      lastDeskewAngleDegrees: Number(this.diagnosticLastDeskewAngleDegrees.toFixed(2)),
      imageQuality: this.lastImageQuality ? {
        dynamicRange: Number(this.lastImageQuality.dynamicRange.toFixed(1)),
        meanLuminance: Number(this.lastImageQuality.meanLuminance.toFixed(1)),
        horizontalContrast: Number(this.lastImageQuality.contrast.toFixed(1)),
        verticalContrast: Number(this.lastImageQuality.verticalContrast.toFixed(1)),
        edgeStrength: Number(this.lastImageQuality.edgeStrength.toFixed(1)),
        horizontalNoise: Number(this.lastImageQuality.noise.toFixed(1)),
        verticalNoise: Number(this.lastImageQuality.verticalNoise.toFixed(1)),
        specularGlareFraction: Number(this.lastImageQuality.specularGlareFraction.toFixed(3)),
        glareBandCoverage: Number(this.lastImageQuality.glareBandCoverage.toFixed(3)),
        glareBandOrientation: this.lastImageQuality.glareBandOrientation,
        issues: this.lastImageQuality.issues,
      } : null,
      qualityProfile: this.lastImageQualityProfile,
      adaptiveProcessingPlan: this.lastAdaptiveProcessingPlan,
      notFound: this.diagnosticNotFound,
      checksumErrors: this.diagnosticChecksum,
      formatErrors: this.diagnosticFormat,
      unexpectedErrors: this.diagnosticUnexpected,
      sourceWidth: this.lastFrameWidth,
      sourceHeight: this.lastFrameHeight,
      roiWidth: this.lastRoiWidth,
      roiHeight: this.lastRoiHeight,
      roiSourceScale: Number(this.diagnosticRoiSourceScale.toFixed(3)),
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
    this.diagnosticRoiUnavailable = 0;
    this.diagnosticRotationAttempts = 0;
    this.diagnosticRotationHits = 0;
    this.diagnosticDeskewAttempts = 0;
    this.diagnosticDeskewEstimateMisses = 0;
    this.diagnosticDeskewHits = 0;
    this.diagnosticGeometryAttempts = 0;
    this.diagnosticGeometryHits = 0;
    this.diagnosticLastGeometryTransform = null;
    this.diagnosticScaleAttempts = 0;
    this.diagnosticScaleHits = 0;
    this.diagnosticLastScaleFactor = 0;
    this.diagnosticLastDeskewAngleDegrees = 0;
    this.diagnosticRoiSourceScale = 1;
    this.lastImageQuality = null;
    this.lastImageQualityProfile = null;
    this.lastAdaptiveProcessingPlan = null;
    this.lastFocusAt = 0;
    this.previousFocusPixels = null;
    this.previousFocusKey = null;
    this.previousFocusWidth = 0;
    this.previousFocusHeight = 0;
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
    this.lastImageQuality = null;
    this.lastImageQualityProfile = null;
    this.lastAdaptiveProcessingPlan = null;
    this.stageCosts = {};
  }
}
