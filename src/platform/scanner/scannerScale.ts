/**
 * Bounded sampling scales for the strict module-owned scanner ROI.
 *
 * The 1.5x entry is the existing production baseline and must remain first.
 * Alternate scales are attempted only after the complete baseline decode path
 * misses. Additional candidates are capped by pixel count to bound allocations.
 */
export type ScannerRoiScaleCandidate = {
  scale: number;
  width: number;
  height: number;
  baseline: boolean;
};

const BASELINE_SCALE = 1.5;
const ALTERNATE_SCALES = [1, 2] as const;
/** One hard ceiling shared by the scale planner and the WASM input boundary. */
export const MAX_DECODE_CANDIDATE_PIXELS = 1_500_000;

// Bound the source ROI, not the entire camera frame. The old full-frame width
// cap discarded useful sensor pixels on 1080p/4K cameras before the decoder
// ever saw the barcode. Keep a bounded native crop for mobile memory safety.
export const MAX_ROI_SOURCE_WIDTH = 2048;
export const MAX_ROI_SOURCE_PIXELS = 1_500_000;

export type ScannerRoiBaseDimensions = {
  width: number;
  height: number;
  sourceScale: number;
};

export function resolveScannerRoiBaseDimensions(
  sourceWidth: number,
  sourceHeight: number,
): ScannerRoiBaseDimensions | null {
  if (![sourceWidth, sourceHeight].every(Number.isFinite)
    || !Number.isSafeInteger(sourceWidth)
    || !Number.isSafeInteger(sourceHeight)
    || sourceWidth < 1 || sourceHeight < 1) return null;

  const widthScale = Math.min(1, MAX_ROI_SOURCE_WIDTH / sourceWidth);
  const pixelScale = Math.min(1, Math.sqrt(MAX_ROI_SOURCE_PIXELS / (sourceWidth * sourceHeight)));
  const sourceScale = Math.min(widthScale, pixelScale);
  const width = Math.max(1, Math.floor(sourceWidth * sourceScale));
  const height = Math.max(1, Math.floor(sourceHeight * sourceScale));
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width > MAX_ROI_SOURCE_WIDTH || width * height > MAX_ROI_SOURCE_PIXELS) return null;

  return { width, height, sourceScale };
}

function dimensionsAtScale(
  baseWidth: number,
  baseHeight: number,
  requestedScale: number,
  pixelBudget: number,
): ScannerRoiScaleCandidate | null {
  if (![baseWidth, baseHeight, requestedScale].every(Number.isFinite)
    || baseWidth < 1 || baseHeight < 1 || requestedScale <= 0) return null;

  const requestedPixels = baseWidth * baseHeight * requestedScale * requestedScale;
  const budgetScale = requestedPixels > pixelBudget
    ? Math.sqrt(pixelBudget / (baseWidth * baseHeight))
    : requestedScale;
  const scale = Math.min(requestedScale, budgetScale);
  // Preserve rounded 1.5x dimensions when they fit. If integer rounding
  // crosses the shared hard budget, floor a bounded scale instead.
  const dimension = requestedScale === BASELINE_SCALE ? Math.round : Math.floor;
  let width = Math.max(1, dimension(baseWidth * scale));
  let height = Math.max(1, dimension(baseHeight * scale));
  let resolvedScale = scale;
  if (width * height > pixelBudget) {
    resolvedScale = Math.min(scale, Math.sqrt(pixelBudget / (baseWidth * baseHeight)));
    width = Math.max(1, Math.floor(baseWidth * resolvedScale));
    height = Math.max(1, Math.floor(baseHeight * resolvedScale));
  }
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width * height > pixelBudget) return null;

  return { scale: resolvedScale, width, height, baseline: requestedScale === BASELINE_SCALE };
}

/**
 * Return the 1.5x baseline followed by at most two bounded fallbacks.
 * Every candidate, including the baseline, shares the exact decoder input
 * pixel ceiling. Oversized requests are downscaled rather than emitted only
 * to be rejected by the WASM adapter.
 */
export function resolveScannerRoiScaleCandidates(
  baseWidth: number,
  baseHeight: number,
): ScannerRoiScaleCandidate[] {
  const baseline = dimensionsAtScale(
    baseWidth,
    baseHeight,
    BASELINE_SCALE,
    MAX_DECODE_CANDIDATE_PIXELS,
  );
  if (!baseline) return [];

  const candidates: ScannerRoiScaleCandidate[] = [baseline];
  for (const requestedScale of ALTERNATE_SCALES) {
    const candidate = dimensionsAtScale(
      baseWidth,
      baseHeight,
      requestedScale,
      MAX_DECODE_CANDIDATE_PIXELS,
    );
    if (!candidate) continue;
    if (candidates.some((item) => item.width === candidate.width && item.height === candidate.height)) continue;
    candidates.push(candidate);
  }
  return candidates;
}
