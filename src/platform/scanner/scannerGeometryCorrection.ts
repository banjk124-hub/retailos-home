import type { ScannerLuminanceFrame } from './scannerDeskew';

export type ScannerGeometryCandidate = ScannerLuminanceFrame & {
  kind: 'perspective' | 'curved';
  confidence: number;
  correction: 'row-mesh' | 'column-envelope' | 'combined-grid';
};

type RowProfile = { y: number; edges: number[] };
type ColumnProfile = { x: number; top: number; bottom: number };
type GeometryModel = {
  rows: RowProfile[];
  referenceEdges: number[];
  columns: ColumnProfile[];
  referenceTop: number;
  referenceBottom: number;
  kind: ScannerGeometryCandidate['kind'];
  correction: ScannerGeometryCandidate['correction'];
  confidence: number;
};

const MAX_PIXELS = 1_500_000;
const MAX_PROFILES = 28;
const MIN_ROW_EDGES = 12;
const EDGE_THRESHOLD = 48;
const MIN_SEGMENT_SCALE = 0.55;
const MAX_SEGMENT_SCALE = 1.8;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function interpolate1D(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (Math.abs(x1 - x0) < 1e-6) return (y0 + y1) / 2;
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return y0 + (y1 - y0) * t;
}

/** Detect stable vertical bar boundaries on a horizontal scanline. */
function detectRowEdges(data: Uint8ClampedArray, width: number, y: number): number[] {
  const offset = y * width;
  const candidates: Array<{ x: number; strength: number }> = [];
  for (let x = 2; x < width - 2; x++) {
    const strength = Math.abs(data[offset + x + 1] - data[offset + x - 1]);
    if (strength >= EDGE_THRESHOLD
      && strength >= Math.abs(data[offset + x] - data[offset + x - 2])
      && strength >= Math.abs(data[offset + x + 2] - data[offset + x])) {
      candidates.push({ x, strength });
    }
  }
  candidates.sort((a, b) => b.strength - a.strength);
  const selected: number[] = [];
  for (const candidate of candidates) {
    if (selected.every((x) => Math.abs(x - candidate.x) > 2)) selected.push(candidate.x);
  }
  selected.sort((a, b) => a - b);
  if (selected.length < MIN_ROW_EDGES) return [];
  const left = selected[Math.floor(selected.length * 0.03)];
  const right = selected[Math.floor(selected.length * 0.97)];
  if (right - left < width * 0.25 || right - left > width * 0.98) return [];
  return selected.filter((x) => x >= left - 2 && x <= right + 2);
}

function sampleRowProfiles(frame: ScannerLuminanceFrame): RowProfile[] {
  const { luminance, width, height } = frame;
  const count = Math.min(MAX_PROFILES, Math.max(16, Math.floor(height / 3)));
  const stride = (height - 4) / (count - 1);
  const profiles: RowProfile[] = [];
  for (let index = 0; index < count; index++) {
    const y = Math.round(2 + index * stride);
    const edges = detectRowEdges(luminance, width, y);
    if (edges.length >= MIN_ROW_EDGES) profiles.push({ y, edges });
  }
  if (profiles.length < 10) return [];

  const countFrequency = new Map<number, number>();
  for (const profile of profiles) {
    countFrequency.set(profile.edges.length, (countFrequency.get(profile.edges.length) ?? 0) + 1);
  }
  const stableCount = [...countFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
  if (stableCount === undefined) return [];
  const stable = profiles.filter((profile) => profile.edges.length === stableCount);
  return stable.length >= Math.max(10, Math.ceil(profiles.length * 0.55)) ? stable : [];
}

/**
 * For columns containing repeated dark barcode bars, observe the top/bottom
 * barcode boundary. This catches the orthogonal perspective axis that a
 * row-only envelope cannot see.
 */
function sampleColumnProfiles(frame: ScannerLuminanceFrame): ColumnProfile[] {
  const { luminance, width, height } = frame;
  const stride = Math.max(1, Math.floor(width / 96));
  const profiles: ColumnProfile[] = [];
  for (let x = 2; x < width - 2; x += stride) {
    let first = -1, last = -1, darkCount = 0;
    for (let y = 1; y < height - 1; y++) {
      if (luminance[y * width + x] < 105) {
        if (first < 0) first = y;
        last = y;
        darkCount++;
      }
    }
    if (first < 0 || last - first < height * 0.35 || darkCount < height * 0.2) continue;
    profiles.push({ x, top: first, bottom: last });
  }
  if (profiles.length < 10) return [];

  // Reject text/noise columns that do not agree on a common barcode height.
  const heights = profiles.map((profile) => profile.bottom - profile.top);
  const typicalHeight = median(heights);
  return profiles.filter((profile) =>
    Math.abs((profile.bottom - profile.top) - typicalHeight) <= typicalHeight * 0.35);
}

function interpolateProfileEdges(profiles: RowProfile[], y: number): number[] {
  if (y <= profiles[0].y) return profiles[0].edges;
  if (y >= profiles[profiles.length - 1].y) return profiles[profiles.length - 1].edges;
  for (let index = 1; index < profiles.length; index++) {
    const right = profiles[index];
    if (right.y < y) continue;
    const left = profiles[index - 1];
    const t = (y - left.y) / Math.max(1, right.y - left.y);
    return left.edges.map((value, edgeIndex) =>
      value + (right.edges[edgeIndex] - value) * t);
  }
  return profiles[profiles.length - 1].edges;
}

function mapPiecewise(value: number, sourceAnchors: number[], targetAnchors: number[]): number {
  if (value <= sourceAnchors[0]) {
    return interpolate1D(value, sourceAnchors[0], sourceAnchors[1], targetAnchors[0], targetAnchors[1]);
  }
  for (let index = 1; index < sourceAnchors.length; index++) {
    if (value <= sourceAnchors[index]) {
      return interpolate1D(value, sourceAnchors[index - 1], sourceAnchors[index],
        targetAnchors[index - 1], targetAnchors[index]);
    }
  }
  const last = sourceAnchors.length - 1;
  return interpolate1D(value, sourceAnchors[last - 1], sourceAnchors[last],
    targetAnchors[last - 1], targetAnchors[last]);
}

function bilinearSample(frame: ScannerLuminanceFrame, x: number, y: number): number {
  const { luminance, width, height } = frame;
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 255;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const top = luminance[y0 * width + x0] * (1 - tx)
    + luminance[y0 * width + x1] * tx;
  const bottom = luminance[y1 * width + x0] * (1 - tx)
    + luminance[y1 * width + x1] * tx;
  return Math.round(top * (1 - ty) + bottom * ty);
}

function fitGeometryModel(frame: ScannerLuminanceFrame): GeometryModel | null {
  const { width, height } = frame;
  const rows = sampleRowProfiles(frame);
  const columns = sampleColumnProfiles(frame);
  if (!rows.length && !columns.length) return null;

  let referenceEdges: number[] = [];
  let rowDeviation = 0;
  let rowCurveResidual = 0;
  let rowCorrection = false;
  if (rows.length) {
    const edgeCount = rows[0].edges.length;
    if (rows.every((profile) => profile.edges.length === edgeCount)) {
      referenceEdges = Array.from({ length: edgeCount }, (_, edgeIndex) =>
        median(rows.map((profile) => profile.edges[edgeIndex])));
      const rowOffsets = rows.map((profile) => {
        const shifts = profile.edges.map((edge, index) => edge - referenceEdges[index]);
        return median(shifts);
      });
      rowDeviation = Math.sqrt(rowOffsets.reduce((sum, offset) => sum + offset * offset, 0)
        / rowOffsets.length);
      const first = rowOffsets[0], last = rowOffsets[rowOffsets.length - 1];
      const curveResiduals = rowOffsets.map((offset, index) => {
        const expected = first + (last - first) * index / Math.max(1, rowOffsets.length - 1);
        return Math.abs(offset - expected);
      });
      rowCurveResidual = median(curveResiduals);
      rowCorrection = rowDeviation > Math.max(1.5, width * 0.004)
        || rows.some((profile) => profile.edges.some((edge, index) =>
          Math.abs(edge - referenceEdges[index]) > Math.max(2, width * 0.008)));
    } else {
      return null;
    }
  }

  let referenceTop = 0, referenceBottom = height - 1;
  let columnDeviation = 0;
  let columnCurveResidual = 0;
  let columnCorrection = false;
  if (columns.length >= 10) {
    referenceTop = median(columns.map((profile) => profile.top));
    referenceBottom = median(columns.map((profile) => profile.bottom));
    const offsets = columns.map((profile) => ({
      top: profile.top - referenceTop,
      bottom: profile.bottom - referenceBottom,
    }));
    columnDeviation = Math.sqrt(offsets.reduce((sum, offset) =>
      sum + offset.top * offset.top + offset.bottom * offset.bottom, 0)
      / Math.max(1, offsets.length * 2));
    const first = offsets[0], last = offsets[offsets.length - 1];
    columnCurveResidual = median(offsets.map((offset, index) => {
      const t = index / Math.max(1, offsets.length - 1);
      const topExpected = first.top + (last.top - first.top) * t;
      const bottomExpected = first.bottom + (last.bottom - first.bottom) * t;
      return (Math.abs(offset.top - topExpected) + Math.abs(offset.bottom - bottomExpected)) / 2;
    }));
    columnCorrection = columnDeviation > Math.max(1.5, height * 0.012)
      && referenceBottom - referenceTop > height * 0.35;
  }

  if (!rowCorrection && !columnCorrection) return null;

  // Refuse severe discontinuities. The mesh must be monotonic and bounded;
  // missing edges from glare, clipping or occlusion are not reconstructed.
  if (rowCorrection) {
    for (let index = 1; index < referenceEdges.length; index++) {
      if (referenceEdges[index] - referenceEdges[index - 1] < 2) return null;
    }
    for (const profile of rows) {
      for (let index = 1; index < profile.edges.length; index++) {
        const scale = (profile.edges[index] - profile.edges[index - 1])
          / (referenceEdges[index] - referenceEdges[index - 1]);
        if (!Number.isFinite(scale) || scale < MIN_SEGMENT_SCALE || scale > MAX_SEGMENT_SCALE) return null;
      }
    }
  }
  if (columnCorrection) {
    for (const profile of columns) {
      const sourceHeight = profile.bottom - profile.top;
      const targetHeight = referenceBottom - referenceTop;
      const scale = sourceHeight / targetHeight;
      if (!Number.isFinite(scale) || scale < MIN_SEGMENT_SCALE || scale > MAX_SEGMENT_SCALE) return null;
    }
  }

  const nonlinear = rowCurveResidual > width * 0.004
    || columnCurveResidual > height * 0.012;
  const kind: ScannerGeometryCandidate['kind'] = nonlinear ? 'curved' : 'perspective';
  const confidence = clamp(
    0.45
      + (rows.length ? Math.min(0.25, rows.length / MAX_PROFILES * 0.25) : 0)
      + (columns.length ? Math.min(0.2, columns.length / 96 * 0.2) : 0)
      - (nonlinear ? 0.03 : 0),
    0.35,
    0.95,
  );
  const correction: ScannerGeometryCandidate['correction'] =
    rowCorrection && columnCorrection ? 'combined-grid'
      : rowCorrection ? 'row-mesh' : 'column-envelope';

  return {
    rows: rowCorrection ? rows : [],
    referenceEdges,
    columns: columnCorrection ? columns : [],
    referenceTop,
    referenceBottom,
    kind,
    correction,
    confidence,
  };
}

function rectify(frame: ScannerLuminanceFrame, model: GeometryModel): ScannerGeometryCandidate {
  const { width, height } = frame;
  const output = new Uint8ClampedArray(width * height);
  const rowTargets = model.referenceEdges;
  const rowSources = new Array<number>(rowTargets.length + 2);
  const rowDestinations = new Array<number>(rowTargets.length + 2);
  const columnXs = model.columns.map((profile) => profile.x);
  const columnTops = model.columns.map((profile) => profile.top);
  const columnBottoms = model.columns.map((profile) => profile.bottom);

  for (let y = 0; y < height; y++) {
    const rowEdges = model.rows.length ? interpolateProfileEdges(model.rows, y) : [];
    for (let x = 0; x < width; x++) {
      let sourceX = x;
      if (rowEdges.length) {
        rowSources[0] = 0;
        rowDestinations[0] = 0;
        for (let index = 0; index < rowTargets.length; index++) {
          rowSources[index + 1] = rowTargets[index];
          rowDestinations[index + 1] = rowEdges[index];
        }
        rowSources[rowSources.length - 1] = width - 1;
        rowDestinations[rowDestinations.length - 1] = width - 1;
        sourceX = mapPiecewise(x, rowSources, rowDestinations);
      }

      let sourceY = y;
      if (model.columns.length >= 2 && columnXs.length >= 2) {
        const top = mapPiecewise(sourceX, columnXs, columnTops);
        const bottom = mapPiecewise(sourceX, columnXs, columnBottoms);
        const targetHeight = model.referenceBottom - model.referenceTop;
        const sourceHeight = bottom - top;
        if (targetHeight > 1 && sourceHeight > 1) {
          const targetAnchors = [0, model.referenceTop, model.referenceBottom, height - 1];
          const sourceAnchors = [0, top, bottom, height - 1];
          sourceY = mapPiecewise(y, targetAnchors, sourceAnchors);
        }
      }
      output[y * width + x] = bilinearSample(frame, sourceX, sourceY);
    }
  }

  return {
    luminance: output,
    width,
    height,
    kind: model.kind,
    confidence: model.confidence,
    correction: model.correction,
  };
}

/**
 * SCAN-09 bounded 2D geometry correction. It estimates both horizontal
 * scanline edge traces and the orthogonal top/bottom barcode envelope, then
 * builds a monotonic piecewise mesh. The same model can rectify modest planar
 * perspective, cylindrical bow and localized smooth surface deformation.
 *
 * It is intentionally not a general-purpose dewarper: unstable edge counts,
 * missing boundaries, glare-obscured structure and excessive local scale
 * changes are rejected. The original ROI is never expanded or mutated.
 */
export function createScannerGeometryCandidates(frame: ScannerLuminanceFrame): ScannerGeometryCandidate[] {
  const { width, height, luminance } = frame;
  if (!(luminance instanceof Uint8ClampedArray)
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 80 || height < 48
    || !Number.isSafeInteger(width * height)
    || luminance.length !== width * height || luminance.length > MAX_PIXELS) return [];
  const model = fitGeometryModel(frame);
  return model ? [rectify(frame, model)] : [];
}
