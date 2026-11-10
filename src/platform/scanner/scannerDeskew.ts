export type ScannerSkewEstimate = {
  /** Signed dominant barcode-edge normal angle in image coordinates. */
  angleDegrees: number;
  /** Directional concentration multiplied by local orientation coherence. */
  confidence: number;
};

export type ScannerLuminanceFrame = {
  luminance: Uint8ClampedArray;
  width: number;
  height: number;
};

// The estimate is modulo 180° because a 1D barcode's bars have no directional
// polarity. The signed range [-90°, 90°] is sufficient to align scanlines.
// Ignore sub-pixel orientation noise; larger estimates are normalized continuously.
const MIN_SKEW_DEGREES = 0.65;
const MAX_SKEW_DEGREES = 90;
const MIN_DIRECTIONAL_ENERGY_RATIO = 0.18;
const MIN_ORIENTATION_COHERENCE = 0.55;
const MIN_GRADIENT_SAMPLES = 24;
const SAMPLE_STEP = 2;
const GRADIENT_THRESHOLD_SQUARED = 32 * 32;
const ORIENTATION_BINS = 180;
const HISTOGRAM_SMOOTH_RADIUS = 2;
const ORIENTATION_WINDOW_RADIUS = 8;
const MAX_DESKEW_PIXELS = 6_000_000;

function isValidFrame(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  return luminance instanceof Uint8ClampedArray
    && Number.isSafeInteger(width)
    && Number.isSafeInteger(height)
    && width >= 3
    && height >= 3
    && Number.isSafeInteger(width * height)
    && luminance.length === width * height;
}

function wrapHalfTurn(angleDegrees: number): number {
  let wrapped = ((angleDegrees + 90) % 180 + 180) % 180 - 90;
  if (wrapped === -90 && angleDegrees > 0) wrapped = 90;
  return wrapped;
}

/**
 * Estimate the barcode scanline-normal angle from a 180-bin Sobel-gradient
 * orientation histogram. Unlike a global structure tensor, the histogram
 * retains competing edge directions and measures how much gradient energy
 * agrees with the dominant direction. Opposite edge polarities are folded
 * together because 1D barcode bars are directionless.
 *
 * The returned angle is continuous across the full half-turn range, not a
 * fixed list of orthogonal angles. It is an image-orientation estimate, not
 * perspective or curved-label correction; ZXing remains the final validator.
 */
export function estimateScannerSkewAngle(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): ScannerSkewEstimate | null {
  if (!isValidFrame(luminance, width, height)) return null;

  const histogram = new Float64Array(ORIENTATION_BINS);
  const marginX = Math.max(1, Math.floor(width * 0.03));
  const marginY = Math.max(1, Math.floor(height * 0.03));
  let totalEnergy = 0;
  let samples = 0;

  for (let y = marginY + 1; y < height - marginY - 1; y += SAMPLE_STEP) {
    const rowAbove = (y - 1) * width;
    const rowCurrent = y * width;
    const rowBelow = (y + 1) * width;

    for (let x = marginX + 1; x < width - marginX - 1; x += SAMPLE_STEP) {
      const topLeft = luminance[rowAbove + x - 1];
      const top = luminance[rowAbove + x];
      const topRight = luminance[rowAbove + x + 1];
      const left = luminance[rowCurrent + x - 1];
      const right = luminance[rowCurrent + x + 1];
      const bottomLeft = luminance[rowBelow + x - 1];
      const bottom = luminance[rowBelow + x];
      const bottomRight = luminance[rowBelow + x + 1];

      const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const energy = gx * gx + gy * gy;
      if (energy < GRADIENT_THRESHOLD_SQUARED) continue;

      const angle = ((Math.atan2(gy, gx) * (180 / Math.PI)) % 180 + 180) % 180;
      const bin = Math.round(angle) % ORIENTATION_BINS;
      histogram[bin] += energy;
      totalEnergy += energy;
      samples += 1;
    }
  }

  if (samples < MIN_GRADIENT_SAMPLES || !Number.isFinite(totalEnergy) || totalEnergy <= 0) {
    return null;
  }

  let peakBin = 0;
  let peakEnergy = -1;
  for (let bin = 0; bin < ORIENTATION_BINS; bin += 1) {
    let smoothedEnergy = 0;
    for (let offset = -HISTOGRAM_SMOOTH_RADIUS; offset <= HISTOGRAM_SMOOTH_RADIUS; offset += 1) {
      const distance = Math.abs(offset);
      smoothedEnergy += histogram[(bin + offset + ORIENTATION_BINS) % ORIENTATION_BINS]
        * (HISTOGRAM_SMOOTH_RADIUS + 1 - distance);
    }
    if (smoothedEnergy > peakEnergy) {
      peakEnergy = smoothedEnergy;
      peakBin = bin;
    }
  }

  // Compute a sub-degree circular mean around the dominant histogram peak.
  // Doubling the angle makes 0° and 180° the same orientation axis.
  let localEnergy = 0;
  let orientationX = 0;
  let orientationY = 0;
  for (let offset = -ORIENTATION_WINDOW_RADIUS; offset <= ORIENTATION_WINDOW_RADIUS; offset += 1) {
    const bin = (peakBin + offset + ORIENTATION_BINS) % ORIENTATION_BINS;
    const energy = histogram[bin];
    const radians = bin * 2 * (Math.PI / 180);
    localEnergy += energy;
    orientationX += energy * Math.cos(radians);
    orientationY += energy * Math.sin(radians);
  }

  if (localEnergy <= 0) return null;
  const directionalEnergyRatio = localEnergy / totalEnergy;
  const orientationCoherence = Math.hypot(orientationX, orientationY) / localEnergy;
  if (!Number.isFinite(directionalEnergyRatio)
    || !Number.isFinite(orientationCoherence)
    || directionalEnergyRatio < MIN_DIRECTIONAL_ENERGY_RATIO
    || orientationCoherence < MIN_ORIENTATION_COHERENCE) {
    return null;
  }

  const dominantAngle = 0.5 * Math.atan2(orientationY, orientationX) * (180 / Math.PI);
  const angleDegrees = wrapHalfTurn(dominantAngle);
  if (!Number.isFinite(angleDegrees)
    || Math.abs(angleDegrees) < MIN_SKEW_DEGREES
    || Math.abs(angleDegrees) > MAX_SKEW_DEGREES) {
    return null;
  }

  return {
    angleDegrees,
    confidence: Math.min(1, directionalEnergyRatio / 0.5) * orientationCoherence,
  };
}

/**
 * Rotate a grayscale ROI by a continuous in-plane angle (positive = clockwise).
 * The output bounds expand to contain the full rotated input.
 * Bilinear sampling softens resampling artifacts; uncovered pixels are white.
 */
export function rotateLuminanceByAngle(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
  angleDegrees: number,
): ScannerLuminanceFrame | null {
  if (!isValidFrame(luminance, width, height)
    || !Number.isFinite(angleDegrees)
    || Math.abs(angleDegrees) > MAX_SKEW_DEGREES) {
    return null;
  }

  if (Math.abs(angleDegrees) < 0.01) {
    return { luminance: new Uint8ClampedArray(luminance), width, height };
  }

  const radians = angleDegrees * (Math.PI / 180);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const rotatedWidth = Math.ceil(width * Math.abs(cosine) + height * Math.abs(sine));
  const rotatedHeight = Math.ceil(height * Math.abs(cosine) + width * Math.abs(sine));
  const pixelCount = rotatedWidth * rotatedHeight;
  if (!Number.isSafeInteger(pixelCount) || pixelCount <= 0 || pixelCount > MAX_DESKEW_PIXELS) {
    return null;
  }

  const rotated = new Uint8ClampedArray(pixelCount);
  rotated.fill(255);
  const sourceCenterX = (width - 1) / 2;
  const sourceCenterY = (height - 1) / 2;
  const destinationCenterX = (rotatedWidth - 1) / 2;
  const destinationCenterY = (rotatedHeight - 1) / 2;

  for (let y = 0; y < rotatedHeight; y += 1) {
    const destinationY = y - destinationCenterY;
    for (let x = 0; x < rotatedWidth; x += 1) {
      const destinationX = x - destinationCenterX;
      const sourceX = cosine * destinationX + sine * destinationY + sourceCenterX;
      const sourceY = -sine * destinationX + cosine * destinationY + sourceCenterY;
      if (sourceX < 0 || sourceY < 0 || sourceX > width - 1 || sourceY > height - 1) continue;

      const x0 = Math.floor(sourceX);
      const y0 = Math.floor(sourceY);
      const x1 = Math.min(width - 1, x0 + 1);
      const y1 = Math.min(height - 1, y0 + 1);
      const xWeight = sourceX - x0;
      const yWeight = sourceY - y0;
      const top = luminance[y0 * width + x0] * (1 - xWeight)
        + luminance[y0 * width + x1] * xWeight;
      const bottom = luminance[y1 * width + x0] * (1 - xWeight)
        + luminance[y1 * width + x1] * xWeight;
      rotated[y * rotatedWidth + x] = Math.round(top * (1 - yWeight) + bottom * yWeight);
    }
  }

  return { luminance: rotated, width: rotatedWidth, height: rotatedHeight };
}

/**
 * Stretch only genuinely compressed ROI luminance ranges. Percentile bounds
 * ignore a small number of glare/shadow outliers; the estimator still runs on
 * the original pixels so contrast normalization cannot manufacture direction.
 */
function normalizeLuminanceContrast(luminance: Uint8ClampedArray): Uint8ClampedArray {
  const histogram = new Uint32Array(256);
  for (let index = 0; index < luminance.length; index += 1) {
    histogram[luminance[index]] += 1;
  }

  const lowerTarget = Math.floor(luminance.length * 0.01);
  const upperTarget = Math.ceil(luminance.length * 0.99);
  let cumulative = 0;
  let lower = 0;
  let upper = 255;
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value];
    if (cumulative > lowerTarget) {
      lower = value;
      break;
    }
  }
  cumulative = 0;
  for (let value = 0; value < 256; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= upperTarget) {
      upper = value;
      break;
    }
  }

  const dynamicRange = upper - lower;
  if (dynamicRange < 24 || dynamicRange >= 220) {
    return new Uint8ClampedArray(luminance);
  }

  const scale = 255 / dynamicRange;
  const normalized = new Uint8ClampedArray(luminance.length);
  for (let index = 0; index < luminance.length; index += 1) {
    const value = luminance[index];
    normalized[index] = value <= lower
      ? 0
      : value >= upper
        ? 255
        : Math.round((value - lower) * scale);
  }
  return normalized;
}

/** Estimate and correct a continuous in-plane barcode orientation; null means no safe estimate. */
export function deskewLuminanceFrame(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): (ScannerLuminanceFrame & ScannerSkewEstimate) | null {
  const estimate = estimateScannerSkewAngle(luminance, width, height);
  if (!estimate) return null;
  const contrastNormalized = normalizeLuminanceContrast(luminance);
  const corrected = rotateLuminanceByAngle(
    contrastNormalized,
    width,
    height,
    -estimate.angleDegrees,
  );
  return corrected ? { ...corrected, ...estimate } : null;
}
