import type { ScannerLuminanceFrame } from './scannerDeskew';

export type ScannerGeometryCandidate = ScannerLuminanceFrame & {
  kind: 'perspective' | 'curved';
  confidence: number;
};

type RowBounds = { y: number; left: number; right: number; center: number; span: number };
const MAX_PIXELS = 1_500_000;

/**
 * Estimate a coherent barcode envelope from repeated high-contrast horizontal
 * scanlines. This is not a general object detector: ambiguous/noisy geometry
 * is rejected rather than guessing an ROI or manufacturing a barcode.
 */
function sampleEnvelope(frame: ScannerLuminanceFrame): RowBounds[] {
  const { luminance: data, width, height } = frame;
  const rows: RowBounds[] = [];
  const margin = Math.max(4, Math.floor(width * 0.04));
  const stride = Math.max(2, Math.floor(height / 28));
  for (let y = margin < height / 4 ? margin : 2; y < height - 2; y += stride) {
    const offset = y * width;
    const edges: number[] = [];
    for (let x = margin; x < width - margin; x++) {
      const strength = Math.abs(data[offset + x + 1] - data[offset + x - 1]);
      if (strength >= 65) edges.push(x);
    }
    if (edges.length < 16) continue;
    const left = edges[Math.floor(edges.length * 0.03)];
    const right = edges[Math.floor(edges.length * 0.97)];
    const span = right - left;
    if (span < width * 0.3 || span > width * 0.94) continue;
    rows.push({ y, left, right, center: (left + right) / 2, span });
  }
  return rows;
}
function median(values: number[]): number {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length / 2)];
}
function interpolate(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): number {
  if (x < 0 || x >= width - 1) return 255;
  const row = Math.max(0, Math.min(height - 1, Math.round(y))) * width;
  const x0 = Math.floor(x), t = x - x0;
  return data[row + x0] * (1 - t) + data[row + x0 + 1] * t;
}
function warpRows(
  frame: ScannerLuminanceFrame,
  rows: RowBounds[],
  kind: ScannerGeometryCandidate['kind'],
  confidence: number,
): ScannerGeometryCandidate {
  const { width, height, luminance } = frame;
  const targetCenter = median(rows.map(r=>r.center));
  const targetSpan = median(rows.map(r=>r.span));
  const data = new Uint8ClampedArray(luminance.length);
  for (let y = 0; y < height; y++) {
    let a = rows[0], b = rows[rows.length - 1];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].y >= y) { a = rows[i-1]; b = rows[i]; break; }
    }
    const t = a.y === b.y ? 0 : Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)));
    const center = a.center + (b.center - a.center) * t;
    const span = a.span + (b.span - a.span) * t;
    const scale = kind === 'perspective' ? span / targetSpan : 1;
    for (let x = 0; x < width; x++) {
      const sourceX = (x - targetCenter) * scale + center;
      data[y * width + x] = interpolate(luminance, width, height, sourceX, y);
    }
  }
  return { luminance: data, width, height, kind, confidence };
}

/**
 * SCAN-09 bounded envelope rectification. Uses no new capture area and returns
 * at most one optional candidate, only for coherent row-to-row deformation.
 * For high-angle planar perspective or severe curvature, a dedicated 2D
 * finder is still required; do not mislabel this as universal dewarping.
 */
export function createScannerGeometryCandidates(frame: ScannerLuminanceFrame): ScannerGeometryCandidate[] {
  const { width, height, luminance } = frame;
  if (width < 80 || height < 48 || luminance.length !== width * height
    || luminance.length > MAX_PIXELS) return [];
  const rows = sampleEnvelope(frame);
  if (rows.length < 12 || rows.length < Math.floor(height / Math.max(2, Math.floor(height / 28))) * 0.45) return [];
  const spans = rows.map(r=>r.span), centers = rows.map(r=>r.center);
  const typicalSpan = median(spans);
  const spanRange = Math.max(...spans) - Math.min(...spans);
  const centerRange = Math.max(...centers) - Math.min(...centers);
  const medianCenter = median(centers);
  const outliers = rows.filter(r=>Math.abs(r.center - medianCenter) > width * 0.16
    || Math.abs(r.span - typicalSpan) > typicalSpan * 0.24);
  if (outliers.length > rows.length * 0.1) return [];

  const top = rows.slice(0, Math.max(3, Math.floor(rows.length / 4)));
  const bottom = rows.slice(-Math.max(3, Math.floor(rows.length / 4)));
  const topSpan = median(top.map(r=>r.span)), bottomSpan = median(bottom.map(r=>r.span));
  const spanDelta = Math.abs(topSpan - bottomSpan);
  const topCenter = median(top.map(r=>r.center)), bottomCenter = median(bottom.map(r=>r.center));
  const centerDelta = Math.abs(topCenter - bottomCenter);
  // A coherent linear change in envelope width is a conservative keystone
  // candidate; the scanner does not infer geometry from a single noisy row.
  if (spanDelta > typicalSpan * 0.06 && spanDelta < typicalSpan * 0.22
    && spanRange < typicalSpan * 0.26) {
    return [warpRows(frame, rows, 'perspective', Math.min(1, spanDelta / typicalSpan / 0.22))];
  }
  // Nonlinear displacement of bar edges is consistent with cylindrical /
  // wrinkled carrier deformation. Only attempt small bounded corrections.
  const middle = rows.slice(Math.floor(rows.length * 0.35), Math.ceil(rows.length * 0.65));
  const middleCenter = median(middle.map(r=>r.center));
  const bow = Math.abs(middleCenter - (topCenter + bottomCenter) / 2);
  if (bow > width * 0.025 && bow < width * 0.12
    && centerRange < width * 0.18 && centerDelta < width * 0.12
    && spanRange < typicalSpan * 0.12) {
    return [warpRows(frame, rows, 'curved', Math.min(1, bow / width / 0.12))];
  }
  return [];
}
