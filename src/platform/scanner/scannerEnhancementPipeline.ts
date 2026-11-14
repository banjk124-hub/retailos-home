import {
  deskewLuminanceFrame,
  deskewLuminanceFrameWithEstimate,
  type ScannerSkewEstimate,
  type ScannerLuminanceFrame,
} from './scannerDeskew';
import { rotateLuminance90Clockwise } from './scannerRotation';
import { measureScannerImageQuality, createScannerImageEnhancements, type ScannerImageQuality } from './scannerImageEnhancement';
import { createScannerGeometryCandidates } from './scannerGeometryCorrection';
import { createScannerAdaptiveProcessingPlan, type ScannerAdaptiveProcessingPlan } from './scannerAdaptiveProcessingController';
import type { ScannerAdaptiveRuntimeBudget } from './scannerAdaptiveRuntimeController';

export type ScannerOrientationHints = {
  upright: ScannerSkewEstimate | null;
  rotated: ScannerSkewEstimate | null;
};

export type ScannerEnhancementStage = 'baseline' | 'orthogonal' | 'deskew' | 'image' | 'geometry';
export type ScannerEnhancementOrientation = 'upright' | 'rotated_90' | 'deskew' | 'rotated_90_deskew';

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
  /** Receives advisory quality observations only; never controls candidate selection. */
  onImageQuality?: (quality: ScannerImageQuality) => void;
  /** Reuse an observation from this exact source frame; undefined requests fallback measurement. */
  imageQuality?: ScannerImageQuality | null;
  /** Emits the deterministic A2 policy selected for this fallback attempt. */
  onProcessingPlan?: (plan: ScannerAdaptiveProcessingPlan) => void;
  /** A3 may reduce fallback work under sustained runtime pressure; never changes baseline. */
  processingBudget?: ScannerAdaptiveRuntimeBudget;
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
  matchedTransform: string | null;
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
 * SCAN-08 image enhancement and SCAN-09 conservative geometry candidates
 * are bounded fallback stages after the existing orientation path misses.
 * No candidate may enlarge the module-owned capture ROI.
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
  let matchedTransform: string | null = null;
  let rotationAttempted = false;
  let deskewAttempts = 0;
  let deskewEstimateMisses = 0;
  let lastDeskewAngleDegrees: number | null = null;

  const attempt = (
    candidate: ScannerEnhancementCandidate,
  ): T | null => {
    candidatesAttempted += 1;
    const output = decodeCandidate(candidate);
    if (output !== null) matchedTransform = candidate.transform ?? null;
    return output;
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
    matchedTransform,
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
      matchedTransform,
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
      orientation: candidate === rotatedDeskew ? 'rotated_90_deskew' : 'deskew',
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
      matchedTransform,
      };
    }
  }

  // SCAN-08: only after all established orientation candidates miss.
  // Feature-gated transforms are never applied to the original buffer.
  // A1 may supply a low-rate observation already measured from this exact ROI.
  // Undefined means no observation was supplied; null means it was measured
  // but the input was not eligible for quality analysis. Only charge the
  // image_quality stage where this pipeline actually performs the analysis.
  let quality: ScannerImageQuality | null;
  if (options.imageQuality !== undefined) {
    quality = options.imageQuality;
  } else {
    const qualityStartedAt = now();
    quality = measureScannerImageQuality(source);
    onStageCost?.('image_quality', now() - qualityStartedAt);
  }
  const processingPlan = createScannerAdaptiveProcessingPlan(quality);
  options.onProcessingPlan?.(processingPlan);
  if (quality) {
    options.onImageQuality?.(quality);
    const enhancementStartedAt = now();
    const availableVariants = createScannerImageEnhancements(source, quality);
    const imageCandidateBudget = Math.min(
      processingPlan.maxImageCandidates,
      options.processingBudget?.maxImageCandidates ?? processingPlan.maxImageCandidates,
    );
    const variants = processingPlan.imageTransforms === null
      ? availableVariants.slice(0, imageCandidateBudget)
      : availableVariants.filter((variant) => processingPlan.imageTransforms?.includes(variant.kind))
        .slice(0, imageCandidateBudget);
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
        matchedTransform,
        };
      }
    }
  }

  // SCAN-09: test geometry after normalizing every supported in-plane
  // orientation. A tilted plane must not be invisible to geometry merely
  // because the barcode arrived rotated 90 degrees or required deskew.
  // The candidate budget is explicit: at most one geometry candidate for
  // each of two normalized orientation surfaces (upright and quarter-turned).
  // Each surface prefers its deskewed representation when available. No
  // Cartesian product of rotations, scales and transforms.
  const geometryStartedAt = now();
  const geometrySources: Array<{
    frame: ScannerLuminanceFrame;
    orientation: ScannerEnhancementOrientation;
  }> = [
    {
      frame: uprightDeskew ?? source,
      orientation: uprightDeskew ? 'deskew' : 'upright',
    },
    ...(rotated ? [{
      frame: rotatedDeskew ?? rotated,
      orientation: rotatedDeskew ? 'rotated_90_deskew' as const : 'rotated_90' as const,
    }] : []),
  ];
  const geometryCandidates = geometrySources.flatMap(({ frame, orientation }) =>
    createScannerGeometryCandidates(frame).map((variant) => ({
      ...variant,
      orientation,
      transform: `${variant.kind}:${variant.correction}`,
    })));
  onStageCost?.('geometry_detection_and_rectification', now() - geometryStartedAt);

  // Prefer the strongest geometric evidence, while retaining a hard upper
  // bound on the amount of rectified data sent through the decoder.
  geometryCandidates.sort((a, b) => b.confidence - a.confidence);
  const geometryCandidateBudget = Math.min(
    processingPlan.geometryCandidateLimit,
    options.processingBudget?.maxGeometryCandidates ?? processingPlan.geometryCandidateLimit,
  );
  for (const variant of geometryCandidates.slice(0, geometryCandidateBudget)) {
    geometryCandidatesAttempted++;
    const output = attempt({ ...variant, stage: 'geometry' });
    if (output !== null) {
      return {
        output, orientationHints, matchedStage: 'geometry', matchedAngleDegrees: null,
        lastDeskewAngleDegrees, rotationAttempted, deskewAttempts,
        deskewEstimateMisses, reusedOrientation, candidatesAttempted,
        imageCandidatesAttempted, geometryCandidatesAttempted,
      matchedTransform,
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
  matchedTransform,
  };
}
