import type { ScannerLuminanceFrame } from './scannerDeskew';

export type ScannerImageQualityIssue =
  | 'low_dynamic_range'
  | 'low_contrast'
  | 'underexposed'
  | 'overexposed'
  | 'shadow_clipping'
  | 'highlight_clipping'
  | 'high_noise';

export type ScannerImageQuality = {
  /** Existing metrics retained with their original definitions for enhancement-gate compatibility. */
  dynamicRange: number;
  darkFraction: number;
  brightFraction: number;
  contrast: number;
  noise: number;
  /** Additional orientation-aware observations. These do not gate decode candidates. */
  meanLuminance: number;
  verticalContrast: number;
  edgeStrength: number;
  verticalNoise: number;
  issues: ScannerImageQualityIssue[];
};
export type ScannerImageEnhancement = ScannerLuminanceFrame & {
  kind: 'contrast' | 'gamma' | 'denoise';
};
const MAX_PIXELS = 1_500_000;
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function median3(a: number, b: number, c: number): number {
  return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
}

/**
 * Bounded, low-resolution quality observation of the supplied ROI.
 *
 * The original fields (dynamicRange, darkFraction, brightFraction, contrast,
 * noise) retain their established calculations because contrast/noise still
 * participate in the existing enhancement gates. Additional vertical and
 * gradient observations make the assessment less dependent on barcode
 * orientation. Issue flags are advisory only: they never reject a frame,
 * change the ROI, alter camera controls, or change candidate order.
 */
export function measureScannerImageQuality(frame: ScannerLuminanceFrame): ScannerImageQuality | null {
  const { luminance: data, width, height } = frame;
  if (!(data instanceof Uint8ClampedArray)
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 16 || height < 16
    || !Number.isSafeInteger(width * height)
    || data.length !== width * height || data.length > MAX_PIXELS) return null;

  const hist = new Uint32Array(256);
  let dark = 0, bright = 0;
  let horizontalEdge = 0, verticalEdge = 0, gradient = 0;
  let horizontalNoise = 0, verticalNoise = 0, luminanceTotal = 0;
  let sampleCount = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(data.length / 12000)));

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const i = y * width + x;
      const value = data[i];
      const left = data[i - 1];
      const above = data[i - width];
      hist[value]++;
      dark += value <= 12 ? 1 : 0;
      bright += value >= 243 ? 1 : 0;
      luminanceTotal += value;

      const dx = Math.abs(value - left);
      const dy = Math.abs(value - above);
      horizontalEdge += dx;
      verticalEdge += dy;
      gradient += Math.hypot(dx, dy);

      // Preserve the original horizontal impulse-noise metric exactly.
      horizontalNoise += Math.abs(value - median3(left, value, data[i + 1]));
      // Add the orthogonal observation without changing the existing gate.
      verticalNoise += Math.abs(value - median3(above, value, data[i + width]));
      sampleCount++;
    }
  }

  if (!sampleCount) return null;
  const targetLow = sampleCount * 0.02;
  const targetHigh = sampleCount * 0.98;
  let cumulative = 0, low = 0, high = 255;
  for (let value = 0; value < 256; value++) {
    cumulative += hist[value];
    if (cumulative >= targetLow) { low = value; break; }
  }
  cumulative = 0;
  for (let value = 0; value < 256; value++) {
    cumulative += hist[value];
    if (cumulative >= targetHigh) { high = value; break; }
  }

  const dynamicRange = high - low;
  const darkFraction = dark / sampleCount;
  const brightFraction = bright / sampleCount;
  const contrast = horizontalEdge / sampleCount;
  const noise = horizontalNoise / sampleCount;
  const meanLuminance = luminanceTotal / sampleCount;
  const verticalContrast = verticalEdge / sampleCount;
  const edgeStrength = gradient / sampleCount;
  const verticalNoiseValue = verticalNoise / sampleCount;

  // These are diagnostic heuristics, not decode eligibility thresholds.
  const issues: ScannerImageQualityIssue[] = [];
  if (dynamicRange < 32) issues.push('low_dynamic_range');
  if (Math.max(contrast, verticalContrast) < 8) issues.push('low_contrast');
  if (meanLuminance < 70 && darkFraction > 0.25) issues.push('underexposed');
  if (meanLuminance > 210 && brightFraction > 0.25) issues.push('overexposed');
  if (darkFraction > 0.6) issues.push('shadow_clipping');
  if (brightFraction > 0.6) issues.push('highlight_clipping');
  if (Math.max(noise, verticalNoiseValue) > 14) issues.push('high_noise');

  return {
    dynamicRange,
    darkFraction,
    brightFraction,
    contrast,
    noise,
    meanLuminance,
    verticalContrast,
    edgeStrength,
    verticalNoise: verticalNoiseValue,
    issues,
  };
}

/**
 * Bounded optional SCAN-08 candidates. No mutation of the original pixels,
 * no invented edges, and no enhancement for saturated/clipped input.
 */
export function createScannerImageEnhancements(
  frame: ScannerLuminanceFrame,
  quality: ScannerImageQuality,
): ScannerImageEnhancement[] {
  const { luminance: src, width, height } = frame;
  if (src.length !== width * height || src.length > MAX_PIXELS) return [];
  const out: ScannerImageEnhancement[] = [];
  const add = (kind: ScannerImageEnhancement['kind'], data: Uint8ClampedArray) =>
    out.push({ kind, luminance: data, width, height });

  // Robust percentile stretch on upright/orthogonal images; previously
  // contrast stretch was only available through the deskew path.
  if (quality.dynamicRange >= 16 && quality.dynamicRange < 150
    && quality.darkFraction < 0.6 && quality.brightFraction < 0.6) {
    const histogram = new Uint32Array(256);
    for (const value of src) histogram[value]++;
    const lowerTarget = src.length * 0.01, upperTarget = src.length * 0.99;
    let sum = 0, lo = 0, hi = 255;
    for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum >= lowerTarget) { lo = i; break; } }
    sum = 0;
    for (let i = 0; i < 256; i++) { sum += histogram[i]; if (sum >= upperTarget) { hi = i; break; } }
    if (hi - lo >= 16 && hi - lo < 220) {
      const data = new Uint8ClampedArray(src.length), gain = 255 / (hi - lo);
      for (let i = 0; i < src.length; i++) data[i] = clamp((src[i] - lo) * gain);
      add('contrast', data);
    }
  }

  // Gamma brightening only when the original is underexposed, avoiding
  // destructive remapping of already well-exposed white-paper barcodes.
  if (quality.brightFraction < 0.08 && quality.darkFraction > 0.12
    && quality.dynamicRange >= 24) {
    const lut = Uint8Array.from({ length: 256 }, (_, v) => clamp(255 * (v / 255) ** 0.72));
    add('gamma', Uint8ClampedArray.from(src, v => lut[v]));
  }

  // A 1x3 median filter is optional for isolated impulse noise; preserve
  // bar direction and never use it on narrow, already clean bars.
  if (quality.noise > 14 && quality.contrast < 65 && width >= 32) {
    const data = new Uint8ClampedArray(src);
    for (let y = 0; y < height; y++) {
      const offset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const a = src[offset + x - 1], b = src[offset + x], c = src[offset + x + 1];
        data[offset + x] = Math.max(Math.min(a,b), Math.min(Math.max(a,b),c));
      }
    }
    add('denoise', data);
  }
  return out.slice(0, 2);
}
