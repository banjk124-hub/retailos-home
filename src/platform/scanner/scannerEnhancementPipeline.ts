import {
  deskewLuminanceFrame,
  deskewLuminanceFrameWithEstimate,
  type ScannerSkewEstimate,
  type ScannerLuminanceFrame,
} from './scannerDeskew';
import { rotateLuminance90Clockwise } from './scannerRotation';
import { measureScannerImageQuality, createScannerImageEnhancements } from './scannerImageEnhancement';
import { createScannerGeometryCandidates } from './scannerGeometryCorrection';

export type ScannerOrientationHints = {
  upright: ScannerSkewEstimate | null;
  rotated: ScannerSkewEstimate | null;
};

export type ScannerEnhancementStage = 'baseline' | 'orthogonal' | 'deskew' | 'image' | 'geometry';
export type ScannerEnhancementOrientation = 'upright' | 'rotated_90' | 'deskew';

export type ScannerEnhancementCandidate = ScannerLuminanceFrame & {
  stage: ScannerEnhancementStage;
  orientation: ScannerEnhancementOrientation;
  angleDegrees?: number;
  transform?: string;
};

export type ScannerEnhancementPipelineOptions = {
  cachedOrientationHints?: ScannerOrientationHints | null;
  /** Reuse only an estimate already measured for the same source ROI on this decode attempt. */
  reuseOrientationHints?: boolean;
};

export type ScannerEnhancementPipelineResult<T> = {
  output: T | null;
  orientationHints: ScannerOrientationHints | null;
  matchedStage: ScannerEnhancementStage | null;
  matchedAngleDegrees: number | null;
  lastDeskewAngleDegrees: number | null;
  rotationAttempted: boolean;
  deskewAttempts: number;
  deskewEstimateMisses: number;
  reusedOrientation: boolean;
  candidatesAttempted: number;
  imageCandidatesAttempted: number;
  geometryCandidatesAttempted: number;
};

type StageCostObserver = (stage: string, durationMs: number) => void;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Single orchestration point for all image candidates sent to the barcode
 * decoder. The source ROI is immutable and strict; this pipeline only derives
 * bounded representations from that ROI and never expands or recenters it.
 *
 * Candidate order intentionally preserves deployed behavior:
 * 1. Original luminance.
 * 2. Exact 90-degree clockwise representation.
 * 3. Confidence-gated continuous deskew candidates, smallest correction first.
 *
 * SCAN-08 image enhancement and SCAN-09 geometric correction can be added as
 * later stages here without duplicating orchestration in the ZXing adapter.
 */
export function executeScannerEnhancementPipeline<T>(
  source: ScannerLuminanceFrame,
  options: ScannerEnhancementPipelineOptions,
  decodeCandidate: (candidate: ScannerEnhancementCandidate) => T | null,
  onStageCost?: StageCostObserver,
): ScannerEnhancementPipelineResult<T> {
  let candidatesAttempted = 0;
  let imageCandidatesAttempted = 0;
  let geometryCandidatesAttempted = 0;
  let rotationAttempted = false;
  let deskewAttempts = 0;
  let deskewEstimateMisses = 0;
  let lastDeskewAngleDegrees: number | null = null;

  const attempt = (
    candidate: ScannerEnhancementCandidate,
  ): T | null => {
    candidatesAttempted += 1;
    return decodeCandidate(candidate);
  };

  const baselineOutput = attempt({
    ...source,
    stage: 'baseline',
    orientation: 'upright',
  });
  if (baselineOutput !== null) {
    return {
      output: baselineOutput,
      orientationHints: options.cachedOrientationHints ?? null,
      matchedStage: 'baseline',
      matchedAngleDegrees: null,
      lastDeskewAngleDegrees,
      rotationAttempted,
      deskewAttempts,
      deskewEstimateMisses,
      reusedOrientation: false,
      candidatesAttempted,
      imageCandidatesAttempted,
      geometryCandidatesAttempted,
    };
  }

  const rotationStartedAt = now();
  const rotated = rotateLuminance90Clockwise(
    source.luminance,
    source.width,
    source.height,
  );
  onStageCost?.('rotation_90_clockwise', now() - rotationStartedAt);

  if (rotated) {
    rotationAttempted = true;
    const rotatedOutput = attempt({
      ...rotated,
      stage: 'orthogonal',
      orientation: 'rotated_90',
    });
    if (rotatedOutput !== null) {
      return {
        output: rotatedOutput,
        orientationHints: options.cachedOrientationHints ?? null,
        matchedStage: 'orthogonal',
        matchedAngleDegrees: null,
        lastDeskewAngleDegrees,
        rotationAttempted,
        deskewAttempts,
        deskewEstimateMisses,
        reusedOrientation: false,
        candidatesAttempted,
        imageCandidatesAttempted,
        geometryCandidatesAttempted,
      imageCandidatesAttempted,
      geometryCandidatesAttempted,
      };
    }
  }

  const deskewStartedAt = now();
  const cachedHints = options.reuseOrientationHints
    ? options.cachedOrientationHints ?? null
    : null;
  const reusedOrientation = Boolean(cachedHints?.upright || cachedHints?.rotated);

  deskewAttempts += 1;
  const uprightDeskew = cachedHints?.upright
    ? deskewLuminanceFrameWithEstimate(
      source.luminance,
      source.width,
      source.height,
      cachedHints.upright,
    )
    : deskewLuminanceFrame(source.luminance, source.width, source.height);
  if (!uprightDeskew) deskewEstimateMisses += 1;

  let rotatedDeskew: ReturnType<typeof deskewLuminanceFrame> = null;
  if (rotated) {
    deskewAttempts += 1;
    rotatedDeskew = cachedHints?.rotated
      ? deskewLuminanceFrameWithEstimate(
        rotated.luminance,
        rotated.width,
        rotated.height,
        cachedHints.rotated,
      )
      : deskewLuminanceFrame(rotated.luminance, rotated.width, rotated.height);
    if (!rotatedDeskew) deskewEstimateMisses += 1;
  }

  const orientationHints: ScannerOrientationHints = {
    upright: uprightDeskew
      ? { angleDegrees: uprightDeskew.angleDegrees, confidence: uprightDeskew.confidence }
      : cachedHints?.upright ?? null,
    rotated: rotatedDeskew
      ? { angleDegrees: rotatedDeskew.angleDegrees, confidence: rotatedDeskew.confidence }
      : cachedHints?.rotated ?? null,
  };

  const deskewCandidates: ScannerEnhancementCandidate[] = [
    uprightDeskew,
    rotatedDeskew,
  ]
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => Math.abs(a.angleDegrees) - Math.abs(b.angleDegrees))
    .map((candidate) => ({
      ...candidate,
      stage: 'deskew',
      orientation: 'deskew',
    }));

  onStageCost?.(
    reusedOrientation
      ? 'deskew_reuse_orientation_and_rotate'
      : 'deskew_estimate_and_rotate',
    now() - deskewStartedAt,
  );

  for (const candidate of deskewCandidates) {
    lastDeskewAngleDegrees = candidate.angleDegrees ?? null;
    const output = attempt(candidate);
    if (output !== null) {
      return {
        output,
        orientationHints,
        matchedStage: 'deskew',
        matchedAngleDegrees: candidate.angleDegrees ?? null,
        lastDeskewAngleDegrees,
        rotationAttempted,
        deskewAttempts,
        deskewEstimateMisses,
        reusedOrientation,
        candidatesAttempted,
        imageCandidatesAttempted,
        geometryCandidatesAttempted,
      imageCandidatesAttempted,
      geometryCandidatesAttempted,
      };
    }
  }

  // SCAN-08: only after all established orientation candidates miss.
  // Feature-gated transforms are never applied to the original buffer.
  const qualityStartedAt = now();
  const quality = measureScannerImageQuality(source);
  onStageCost?.('image_quality', now() - qualityStartedAt);
  if (quality) {
    const enhancementStartedAt = now();
    const variants = createScannerImageEnhancements(source, quality);
    onStageCost?.('image_enhancement', now() - enhancementStartedAt);
    for (const variant of variants) {
      imageCandidatesAttempted++;
      const output = attempt({ ...variant, stage: 'image', orientation: 'upright', transform: variant.kind });
      if (output !== null) {
        return {
          output, orientationHints, matchedStage: 'image', matchedAngleDegrees: null,
          lastDeskewAngleDegrees, rotationAttempted, deskewAttempts,
          deskewEstimateMisses, reusedOrientation, candidatesAttempted,
          imageCandidatesAttempted, geometryCandidatesAttempted,
        };
      }
    }
  }

  // SCAN-09: bounded geometric fallback, never a substitute for SCAN-04 ROI.
  const geometryStartedAt = now();
  const geometryVariants = createScannerGeometryCandidates(source);
  onStageCost?.('geometry_detection_and_rectification', now() - geometryStartedAt);
  for (const variant of geometryVariants) {
    geometryCandidatesAttempted++;
    const output = attempt({ ...variant, stage: 'geometry', orientation: 'upright', transform: variant.kind });
    if (output !== null) {
      return {
        output, orientationHints, matchedStage: 'geometry', matchedAngleDegrees: null,
        lastDeskewAngleDegrees, rotationAttempted, deskewAttempts,
        deskewEstimateMisses, reusedOrientation, candidatesAttempted,
        imageCandidatesAttempted, geometryCandidatesAttempted,
      };
    }
  }

  return {
    output: null,
    orientationHints,
    matchedStage: null,
    matchedAngleDegrees: null,
    lastDeskewAngleDegrees,
    rotationAttempted,
    deskewAttempts,
    deskewEstimateMisses,
    reusedOrientation,
    candidatesAttempted,
    imageCandidatesAttempted,
    geometryCandidatesAttempted,
  };
}
