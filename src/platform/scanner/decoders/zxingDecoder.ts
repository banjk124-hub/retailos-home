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
import { resolveScannerRoiCrop } from '../scannerRoi';
import type {
  DecoderDecodeOptions,
  DecoderInitOptions,
  DecoderOutput,
  ScannerDecoderAdapter,
} from './decoderAdapter';
import { rgbaToLuminance } from './rgbaToLuminance';
import { executeScannerEnhancementPipeline, type ScannerOrientationHints } from '../scannerEnhancementPipeline';
import { resolveScannerRoiBaseDimensions, resolveScannerRoiScaleCandidates } from '../scannerScale';
import { measureScannerFocusQuality } from '../scannerFocusQuality';
import { createScannerTemporalSnapshot } from '../scannerTemporalRecognition';
import { measureScannerImageQuality, type ScannerImageQuality } from '../scannerImageEnhancement';
import { createScannerImageQualityProfile, type ScannerImageQualityProfile } from '../scannerImageQualityProfile';

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

/**
 * ZXing 0.23.0 logs expected NotFoundException reader misses as console.warn
 * because they are not recognized as ReaderException instances. A continuous
 * scanner intentionally produces many misses; suppress only that exact
 * library diagnostic during the synchronous decode call and forward all
 * unrelated warnings unchanged.
 */
function decodeWithExpectedMissSuppressed(
  reader: MultiFormatReader,
  bitmap: BinaryBitmap,
) {
  const originalWarn = console.warn;
  let patched = false;
  try {
    console.warn = (...args: Parameters<typeof console.warn>) => {
      const [message, error] = args;
      if (message === 'MultiFormatReader: non-ReaderException from reader:'
        && error instanceof Error
        && error.name === 'NotFoundException') {
        return;
      }
      originalWarn.apply(console, args);
    };
    patched = true;
  } catch {
    // Some embedded browsers may expose a non-writable console method.
    // Decode must remain functional even when this diagnostic cannot be muted.
    return reader.decodeWithState(bitmap);
  }

  try {
    return reader.decodeWithState(bitmap);
  } finally {
    if (patched) console.warn = originalWarn;
  }
}

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
 * Each decode is cropped directly from the source frame using the latest
 * module-owned reticle region. There is no full-frame pass and no centered
 * fallback: absent/invalid geometry produces a decode miss. The ROI is
 * upscaled without changing its aspect ratio. Each orientation candidate is
 * checked with Hybrid and GlobalHistogram binarization before being rejected.
 * Camera ownership and frame scheduling remain in UniversalScannerSession.
 */
export class ZXingDecoderAdapter implements ScannerDecoderAdapter {
  readonly id = 'zxing-retail-ean-code128-roi';
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
  private lastFocusQualitySampleAt = 0;
  private lastFocusQualityPixels: Uint8Array | null = null;
  private lastFocusQualityWidth = 0;
  private lastFocusQualityHeight = 0;
  private lastFocusQualityRegionKey: string | null = null;
  private diagnosticLastDeskewAngleDegrees = 0;
  private lastImageQuality: ScannerImageQuality | null = null;
  private lastImageQualityProfile: ScannerImageQualityProfile | null = null;
  private lastFrameWidth = 0;
  private lastFrameHeight = 0;
  private lastRoiWidth = 0;
  private lastRoiHeight = 0;
  private diagnosticRoiSourceScale = 1;
  private cachedOrientationHints: ScannerOrientationHints | null = null;

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
    { timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now(), scanRegion, onFocusQuality, onTemporalFrame }: DecoderDecodeOptions,
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
      const crop = resolveScannerRoiCrop(scanRegion, dimensions.width, dimensions.height);
      if (!crop) {
        this.diagnosticRoiUnavailable += 1;
        this.emitDiagnostics();
        return [];
      }

      this.diagnosticFrames += 1;
      this.lastRoiWidth = crop.width;
      this.lastRoiHeight = crop.height;
      // Preserve native sensor detail inside the strict crop. Bound ROI
      // dimensions/pixels rather than downscaling the entire frame by width.
      const baseDimensions = resolveScannerRoiBaseDimensions(crop.width, crop.height);
      if (!baseDimensions) {
        this.diagnosticRoiUnavailable += 1;
        this.emitDiagnostics();
        return [];
      }
      this.diagnosticRoiSourceScale = baseDimensions.sourceScale;
      const scaleCandidates = resolveScannerRoiScaleCandidates(
        baseDimensions.width,
        baseDimensions.height,
      );

      // Preserve the deployed 1.5x candidate as candidate zero. The crop is
      // now sampled from the native ROI up to a bounded pixel budget; alternate
      // scales run only after the full baseline misses and never expand the crop.
      for (const candidate of scaleCandidates) {
        this.canvas.width = candidate.width;
        this.canvas.height = candidate.height;
        const roiDrawStartedAt = performance.now();
        this.context.drawImage(
          source,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          candidate.width,
          candidate.height,
        );
        this.recordStageCost(
          candidate.baseline ? 'roi_draw_baseline_1_5x' : 'roi_draw_multiscale',
          performance.now() - roiDrawStartedAt,
        );
        this.diagnosticScaleAttempts += 1;
        this.diagnosticLastScaleFactor = candidate.scale;

        const output = this.decodeCurrentCanvas(
          timestamp,
          candidate.baseline ? onFocusQuality : undefined,
          !candidate.baseline,
          candidate.baseline ? onTemporalFrame : undefined,
          candidate.baseline
            ? `${dimensions.width}x${dimensions.height}:${crop.x},${crop.y},${crop.width},${crop.height}`
            : undefined,
        );
        if (output) {
          this.diagnosticScaleHits += 1;
          this.diagnosticDecoded += 1;
          this.diagnosticRoiHits += 1;
          this.emitDiagnostics();
          return [output];
        }
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

  async decodeTemporalSnapshot(
    snapshot: import('../scannerTemporalRecognition').ScannerTemporalSnapshot,
    timestamp: number,
  ): Promise<DecoderOutput[]> {
    if (this.disposed || !this.reader || !Number.isFinite(timestamp)
      || !(snapshot.pixels instanceof Uint8Array)
      || !Number.isSafeInteger(snapshot.width) || !Number.isSafeInteger(snapshot.height)
      || snapshot.width < 1 || snapshot.height < 1
      || snapshot.pixels.length !== snapshot.width * snapshot.height
      || snapshot.pixels.length > 640 * 360) return [];
    if (this.decoding) return [];
    this.decoding = true;
    const startedAt = performance.now();
    try {
      const grayscale = new Uint8ClampedArray(snapshot.pixels);
      const pipelineResult = executeScannerEnhancementPipeline(
        { luminance: grayscale, width: snapshot.width, height: snapshot.height },
        {
          cachedOrientationHints: this.cachedOrientationHints,
          reuseOrientationHints: true,
          onImageQuality: (quality) => { this.lastImageQuality = quality; },
        },
        (candidate) => this.decodeLuminance(
          candidate.luminance,
          candidate.width,
          candidate.height,
          timestamp,
          true,
          candidate.orientation,
        ),
        (stage, durationMs) => this.recordStageCost(stage, durationMs),
      );
      this.cachedOrientationHints = pipelineResult.orientationHints;
      if (pipelineResult.rotationAttempted) this.diagnosticRotationAttempts += 1;
      if (pipelineResult.matchedStage === 'orthogonal') this.diagnosticRotationHits += 1;
      this.diagnosticDeskewAttempts += pipelineResult.deskewAttempts;
      this.diagnosticDeskewEstimateMisses += pipelineResult.deskewEstimateMisses;
      if (pipelineResult.lastDeskewAngleDegrees !== null) {
        this.diagnosticLastDeskewAngleDegrees = pipelineResult.lastDeskewAngleDegrees;
      }
      if (pipelineResult.matchedStage === 'deskew') this.diagnosticDeskewHits += 1;
      this.diagnosticGeometryAttempts += pipelineResult.geometryCandidatesAttempted;
      if (pipelineResult.matchedStage === 'geometry') {
        this.diagnosticGeometryHits += 1;
        this.diagnosticLastGeometryTransform = pipelineResult.matchedTransform;
      }
      if (!pipelineResult.output) return [];
      this.diagnosticDecoded += 1;
      this.diagnosticRoiHits += 1;
      return [pipelineResult.output];
    } finally {
      this.recordStageCost('temporal_fallback_total', performance.now() - startedAt);
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

  private decodeCurrentCanvas(
    timestamp: number,
    onFocusQuality?: DecoderDecodeOptions['onFocusQuality'],
    reuseOrientationHints = false,
    onTemporalFrame?: DecoderDecodeOptions['onTemporalFrame'],
    focusRegionKey?: string,
  ): DecoderOutput | null {
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
    this.recordStageCost('grayscale', performance.now() - grayscaleStartedAt);
    let sampledImageQuality: ScannerImageQuality | null | undefined;
    if (onFocusQuality && timestamp - this.lastFocusQualitySampleAt >= 500) {
      this.lastFocusQualitySampleAt = timestamp;
      const sameFocusGeometry = this.lastFocusQualityWidth === this.canvas.width
        && this.lastFocusQualityHeight === this.canvas.height
        && Boolean(focusRegionKey)
        && this.lastFocusQualityRegionKey === focusRegionKey;
      const focusSample = measureScannerFocusQuality(
        grayscale,
        this.canvas.width,
        this.canvas.height,
        sameFocusGeometry ? this.lastFocusQualityPixels : null,
      );
      this.lastFocusQualityPixels = focusSample.sampledPixels;
      this.lastFocusQualityWidth = this.canvas.width;
      this.lastFocusQualityHeight = this.canvas.height;
      this.lastFocusQualityRegionKey = focusRegionKey ?? null;
      onFocusQuality(focusSample);
      // A1 samples the existing grayscale ROI readback at the same bounded
      // cadence as focus observation; it does not request another camera read.
      sampledImageQuality = measureScannerImageQuality({
        luminance: grayscale,
        width: this.canvas.width,
        height: this.canvas.height,
      });
      if (sampledImageQuality) {
        this.lastImageQuality = sampledImageQuality;
        this.lastImageQualityProfile = createScannerImageQualityProfile({
          timestamp,
          frameWidth: dimensions.width,
          frameHeight: dimensions.height,
          roiX: crop.x,
          roiY: crop.y,
          roiWidth: crop.width,
          roiHeight: crop.height,
          sampleWidth: this.canvas.width,
          sampleHeight: this.canvas.height,
          focus: focusSample,
          image: sampledImageQuality,
        });
      } else {
        this.lastImageQualityProfile = null;
      }
      if (focusSample.valid && onTemporalFrame) {
        const snapshot = createScannerTemporalSnapshot(grayscale, this.canvas.width, this.canvas.height);
        if (snapshot) onTemporalFrame(snapshot, focusSample);
      }
    }

    const pipelineResult = executeScannerEnhancementPipeline(
      {
        luminance: grayscale,
        width: this.canvas.width,
        height: this.canvas.height,
      },
      {
        cachedOrientationHints: this.cachedOrientationHints,
        reuseOrientationHints,
        imageQuality: sampledImageQuality,
        onImageQuality: (quality) => { this.lastImageQuality = quality; },
      },
      (candidate) => this.decodeLuminance(
        candidate.luminance,
        candidate.width,
        candidate.height,
        timestamp,
        true,
        candidate.orientation,
      ),
      (stage, durationMs) => this.recordStageCost(stage, durationMs),
    );

    this.cachedOrientationHints = pipelineResult.orientationHints;
    if (pipelineResult.rotationAttempted) this.diagnosticRotationAttempts += 1;
    if (pipelineResult.matchedStage === 'orthogonal') this.diagnosticRotationHits += 1;
    this.diagnosticDeskewAttempts += pipelineResult.deskewAttempts;
    this.diagnosticDeskewEstimateMisses += pipelineResult.deskewEstimateMisses;
    if (pipelineResult.lastDeskewAngleDegrees !== null) {
      this.diagnosticLastDeskewAngleDegrees = pipelineResult.lastDeskewAngleDegrees;
    }
    if (pipelineResult.matchedStage === 'deskew') this.diagnosticDeskewHits += 1;
    this.diagnosticGeometryAttempts += pipelineResult.geometryCandidatesAttempted;
    if (pipelineResult.matchedStage === 'geometry') {
      this.diagnosticGeometryHits += 1;
      this.diagnosticLastGeometryTransform = pipelineResult.matchedTransform;
    }

    return pipelineResult.output;
  }

  private decodeLuminance(
    grayscale: Uint8ClampedArray,
    width: number,
    height: number,
    timestamp: number,
    includeGlobalHistogram: boolean,
    orientation: 'upright' | 'rotated_90' | 'deskew' | 'rotated_90_deskew',
  ): DecoderOutput | null {
    if (!this.reader) return null;
    const luminance = new RGBLuminanceSource(grayscale, width, height);
    const binarizers = includeGlobalHistogram
      ? [HybridBinarizer, GlobalHistogramBinarizer]
      : [HybridBinarizer];

    for (const Binarizer of binarizers) {
      const zxingStartedAt = performance.now();
      try {
        const bitmap = new BinaryBitmap(new Binarizer(luminance));
        // decode() resets the configured hints when no hints argument is passed.
        // Reuse the initialized retail-format whitelist across camera frames.
        const result = decodeWithExpectedMissSuppressed(this.reader, bitmap);
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
        this.recordStageCost(
          orientation === 'upright'
            ? 'zxing_decode'
            : orientation === 'rotated_90' ? 'zxing_decode_rotated_90'
              : orientation === 'rotated_90_deskew' ? 'zxing_decode_rotated_90_deskew' : 'zxing_decode_deskew',
          performance.now() - zxingStartedAt,
        );
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
      // Latest A1 observation; raw numeric metrics are retained for analysis.
      qualityProfile: this.lastImageQualityProfile,
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
    this.diagnosticRoiSourceScale = 1;
    this.cachedOrientationHints = null;
    this.lastFocusQualitySampleAt = 0;
    this.lastFocusQualityPixels = null;
    this.lastFocusQualityWidth = 0;
    this.lastFocusQualityHeight = 0;
    this.diagnosticLastDeskewAngleDegrees = 0;
    this.lastImageQuality = null;
  }

  dispose(): void {
    this.disposed = true;
    this.reader?.reset();
    this.reader = null;
    this.context = null;
    this.canvas = null;
    this.formats = [];
    this.cachedOrientationHints = null;
    this.decoding = false;
  }
}
