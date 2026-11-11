import type { ScannerLuminanceFrame } from './scannerDeskew';

export type ScannerImageQuality = {
  dynamicRange: number;
  darkFraction: number;
  brightFraction: number;
  contrast: number;
  noise: number;
};
export type ScannerImageEnhancement = ScannerLuminanceFrame & {
  kind: 'contrast' | 'gamma' | 'denoise';
};
const MAX_PIXELS = 1_500_000;
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function measureScannerImageQuality(frame: ScannerLuminanceFrame): ScannerImageQuality | null {
  const { luminance: data, width, height } = frame;
  if (!Number.isSafeInteger(width * height) || width < 16 || height < 16
    || data.length !== width * height || data.length > MAX_PIXELS) return null;
  const hist = new Uint32Array(256);
  let dark = 0, bright = 0, edge = 0, edgeCount = 0, noise = 0, noiseCount = 0;
  const step = Math.max(1, Math.floor(Math.sqrt(data.length / 12000)));
  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const i = y * width + x, v = data[i];
      hist[v]++;
      dark += v <= 12 ? 1 : 0;
      bright += v >= 243 ? 1 : 0;
      edge += Math.abs(v - data[i - 1]);
      edgeCount++;
      const median = [data[i - 1], v, data[i + 1]].sort((a,b)=>a-b)[1];
      noise += Math.abs(v - median);
      noiseCount++;
    }
  }
  if (!edgeCount) return null;
  const targetLow = edgeCount * 0.02, targetHigh = edgeCount * 0.98;
  let cumulative = 0, low = 0, high = 255;
  for (let v = 0; v < 256; v++) { cumulative += hist[v]; if (cumulative >= targetLow) { low = v; break; } }
  cumulative = 0;
  for (let v = 0; v < 256; v++) { cumulative += hist[v]; if (cumulative >= targetHigh) { high = v; break; } }
  return {
    dynamicRange: high - low,
    darkFraction: dark / edgeCount,
    brightFraction: bright / edgeCount,
    contrast: edge / edgeCount,
    noise: noise / noiseCount,
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
