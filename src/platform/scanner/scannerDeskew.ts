export type ScannerSkewEstimate = {
  /** Positive values indicate clockwise in-plane skew in preview/source coordinates. */
  angleDegrees: number;
  confidence: number;
};

export type ScannerLuminanceFrame = {
  luminance: Uint8ClampedArray;
  width: number;
  height: number;
};

const MIN_SKEW_DEGREES = 1.2;
const MAX_SKEW_DEGREES = 12;
const MIN_CONFIDENCE = 0.35;
const MIN_GRADIENT_SAMPLES = 24;
const SAMPLE_STEP = 3;
const GRADIENT_THRESHOLD_SQUARED = 48 * 48;
const MAX_DESKEW_PIXELS = 4_000_000;

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

/**
 * Estimate the dominant vertical-bar edge tilt from a sampled Sobel structure
 * tensor. It is intended for 1D barcode ROIs after orthogonal orientation
 * normalization, not for perspective or curved-label correction.
 */
export function estimateScannerSkewAngle(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): ScannerSkewEstimate | null {
  if (!isValidFrame(luminance, width, height)) return null;

  const marginX = Math.max(1, Math.floor(width * 0.05));
  const marginY = Math.max(1, Math.floor(height * 0.05));
  let jxx = 0;
  let jyy = 0;
  let jxy = 0;
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
      const gxSquared = gx * gx;
      const gySquared = gy * gy;
      if (gxSquared + gySquared < GRADIENT_THRESHOLD_SQUARED) continue;

      jxx += gxSquared;
      jyy += gySquared;
      jxy += gx * gy;
      samples += 1;
    }
  }

  if (samples < MIN_GRADIENT_SAMPLES) return null;
  const energy = jxx + jyy;
  if (!Number.isFinite(energy) || energy <= 0) return null;

  const confidence = Math.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / energy;
  const angleDegrees = 0.5 * Math.atan2(2 * jxy, jxx - jyy) * (180 / Math.PI);
  if (!Number.isFinite(angleDegrees)
    || !Number.isFinite(confidence)
    || confidence < MIN_CONFIDENCE
    || Math.abs(angleDegrees) < MIN_SKEW_DEGREES
    || Math.abs(angleDegrees) > MAX_SKEW_DEGREES) {
    return null;
  }

  return { angleDegrees, confidence };
}

/**
 * Rotate a grayscale ROI by a bounded in-plane angle (positive = clockwise).
 * The output canvas bounds expand to contain the full rotated input. Bilinear
 * sampling softens resampling artifacts; uncovered pixels are white.
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

/** Estimate and correct small in-plane barcode roll; returns null when no safe correction is justified. */
export function deskewLuminanceFrame(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
): (ScannerLuminanceFrame & ScannerSkewEstimate) | null {
  const estimate = estimateScannerSkewAngle(luminance, width, height);
  if (!estimate) return null;
  const corrected = rotateLuminanceByAngle(
    luminance,
    width,
    height,
    -estimate.angleDegrees,
  );
  return corrected ? { ...corrected, ...estimate } : null;
}
