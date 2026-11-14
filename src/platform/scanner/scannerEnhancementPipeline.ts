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
  reuseOrientationHints?: boolean;
  onImageQuality?: (quality: ScannerImageQuality) => void;
  imageQuality?: ScannerImageQuality | null;
  onProcessingPlan?: (plan: ScannerAdaptiveProcessingPlan) => void;
  processingBudget?: ScannerAdaptiveRuntimeBudget;
  /** Stop producing/decoding candidates when the owning session is retired. */
  shouldContinue?: () => boolean;
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
type PipelineState = Omit<ScannerEnhancementPipelineResult<never>, 'output'>;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function createState(options: ScannerEnhancementPipelineOptions): PipelineState {
  return {
    orientationHints: options.cachedOrientationHints ?? null,
    matchedStage: null,
    matchedAngleDegrees: null,
    lastDeskewAngleDegrees: null,
    rotationAttempted: false,
    deskewAttempts: 0,
    deskewEstimateMisses: 0,
    reusedOrientation: false,
    candidatesAttempted: 0,
    imageCandidatesAttempted: 0,
    geometryCandidatesAttempted: 0,
    matchedTransform: null,
  };
}
function result<T>(state: PipelineState, output: T | null): ScannerEnhancementPipelineResult<T> {
  return { ...state, output };
}
function recordAttempt<T>(
  state: PipelineState,
  candidate: ScannerEnhancementCandidate,
  output: T | null,
): void {
  state.candidatesAttempted += 1;
  if (candidate.stage === 'image') state.imageCandidatesAttempted += 1;
  if (candidate.stage === 'geometry') state.geometryCandidatesAttempted += 1;
  if (output !== null) {
    state.matchedStage = candidate.stage;
    state.matchedAngleDegrees = candidate.stage === 'deskew' ? candidate.angleDegrees ?? null : null;
    state.matchedTransform = candidate.transform ?? null;
  }
}

/**
 * One lazy candidate iterator is consumed by both synchronous JS and
 * asynchronous WASM backends. Stage generation is lazy: a successful baseline
 * never pays for rotation, deskew, image analysis or geometry.
 */
function* iterateScannerEnhancementCandidates(
  source: ScannerLuminanceFrame,
  options: ScannerEnhancementPipelineOptions,
  state: PipelineState,
  onStageCost?: StageCostObserver,
): Generator<ScannerEnhancementCandidate> {
  yield { ...source, stage: 'baseline', orientation: 'upright' };

  const rotationStartedAt = now();
  const rotated = rotateLuminance90Clockwise(source.luminance, source.width, source.height);
  onStageCost?.('rotation_90_clockwise', now() - rotationStartedAt);
  if (rotated) {
    state.rotationAttempted = true;
    yield { ...rotated, stage: 'orthogonal', orientation: 'rotated_90' };
  }

  const deskewStartedAt = now();
  const cachedHints = options.reuseOrientationHints ? options.cachedOrientationHints ?? null : null;
  state.reusedOrientation = Boolean(cachedHints?.upright || cachedHints?.rotated);
  state.deskewAttempts += 1;
  const uprightDeskew = cachedHints?.upright
    ? deskewLuminanceFrameWithEstimate(source.luminance, source.width, source.height, cachedHints.upright)
    : deskewLuminanceFrame(source.luminance, source.width, source.height);
  if (!uprightDeskew) state.deskewEstimateMisses += 1;

  let rotatedDeskew: ReturnType<typeof deskewLuminanceFrame> = null;
  if (rotated) {
    state.deskewAttempts += 1;
    rotatedDeskew = cachedHints?.rotated
      ? deskewLuminanceFrameWithEstimate(rotated.luminance, rotated.width, rotated.height, cachedHints.rotated)
      : deskewLuminanceFrame(rotated.luminance, rotated.width, rotated.height);
    if (!rotatedDeskew) state.deskewEstimateMisses += 1;
  }

  const orientationHints: ScannerOrientationHints = {
    upright: uprightDeskew
      ? { angleDegrees: uprightDeskew.angleDegrees, confidence: uprightDeskew.confidence }
      : cachedHints?.upright ?? null,
    rotated: rotatedDeskew
      ? { angleDegrees: rotatedDeskew.angleDegrees, confidence: rotatedDeskew.confidence }
      : cachedHints?.rotated ?? null,
  };
  state.orientationHints = orientationHints;

  const deskewCandidates: ScannerEnhancementCandidate[] = [uprightDeskew, rotatedDeskew]
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((a, b) => Math.abs(a.angleDegrees) - Math.abs(b.angleDegrees))
    .map((candidate) => ({
      ...candidate,
      stage: 'deskew',
      orientation: candidate === rotatedDeskew ? 'rotated_90_deskew' : 'deskew',
    }));
  onStageCost?.(
    state.reusedOrientation ? 'deskew_reuse_orientation_and_rotate' : 'deskew_estimate_and_rotate',
    now() - deskewStartedAt,
  );
  for (const candidate of deskewCandidates) {
    state.lastDeskewAngleDegrees = candidate.angleDegrees ?? null;
    yield candidate;
  }

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
      yield { ...variant, stage: 'image', orientation: 'upright', transform: variant.kind };
    }
  }

  const geometryStartedAt = now();
  const geometrySources: Array<{ frame: ScannerLuminanceFrame; orientation: ScannerEnhancementOrientation }> = [
    { frame: uprightDeskew ?? source, orientation: uprightDeskew ? 'deskew' : 'upright' },
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
  geometryCandidates.sort((a, b) => b.confidence - a.confidence);
  const geometryCandidateBudget = Math.min(
    processingPlan.geometryCandidateLimit,
    options.processingBudget?.maxGeometryCandidates ?? processingPlan.geometryCandidateLimit,
  );
  for (const candidate of geometryCandidates.slice(0, geometryCandidateBudget)) {
    yield { ...candidate, stage: 'geometry' };
  }
}

/**
 * Shared, baseline-first recognition policy. Candidate order, quality gates,
 * transform generation and budgets are identical for every decoder backend.
 */
export function executeScannerEnhancementPipeline<T>(
  source: ScannerLuminanceFrame,
  options: ScannerEnhancementPipelineOptions,
  decodeCandidate: (candidate: ScannerEnhancementCandidate) => T | null,
  onStageCost?: StageCostObserver,
): ScannerEnhancementPipelineResult<T> {
  const state = createState(options);
  const candidates = iterateScannerEnhancementCandidates(source, options, state, onStageCost);
  let output: T | null = null;
  while (options.shouldContinue?.() !== false) {
    const next = candidates.next();
    if (next.done) break;
    const candidate = next.value;
    output = decodeCandidate(candidate);
    recordAttempt(state, candidate, output);
    if (output !== null) break;
  }
  return result(state, output);
}

/** Async twin used by WebAssembly readers; it consumes the exact same lazy candidate iterator. */
export async function executeScannerEnhancementPipelineAsync<T>(
  source: ScannerLuminanceFrame,
  options: ScannerEnhancementPipelineOptions,
  decodeCandidate: (candidate: ScannerEnhancementCandidate) => Promise<T | null>,
  onStageCost?: StageCostObserver,
): Promise<ScannerEnhancementPipelineResult<T>> {
  const state = createState(options);
  const candidates = iterateScannerEnhancementCandidates(source, options, state, onStageCost);
  let output: T | null = null;
  while (options.shouldContinue?.() !== false) {
    const next = candidates.next();
    if (next.done) break;
    const candidate = next.value;
    output = await decodeCandidate(candidate);
    if (options.shouldContinue?.() === false) output = null;
    recordAttempt(state, candidate, output);
    if (output !== null) break;
  }
  return result(state, output);
}
