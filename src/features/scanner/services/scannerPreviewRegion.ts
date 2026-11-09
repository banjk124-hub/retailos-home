import type {
  ScannerNormalizedRect,
  ScannerSourceScanRegion,
} from '../../../platform/scanner/contracts';
import {
  mapPreviewScanRegionToSourceFrame,
  parseScannerObjectPosition,
  type ScannerObjectFit,
} from '../../../platform/scanner/scannerGeometry';

export type ScannerElementRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ScannerPreviewRegionMeasurement = {
  videoRect: ScannerElementRect;
  reticleRect: ScannerElementRect;
  sourceWidth: number;
  sourceHeight: number;
  objectFit: string;
  objectPosition: string;
  /** Computed transform on the video element; unsupported transforms fail closed. */
  transform: string;
};

const FULL_RECT: ScannerNormalizedRect = { x: 0, y: 0, width: 1, height: 1 };
const EPSILON = 1e-7;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveHorizontalMirror(transform: string): boolean | null {
  const value = transform.trim().toLowerCase();
  if (!value || value === 'none') return false;

  const match = value.match(/^matrix\(([^)]+)\)$/);
  if (!match) return null;

  const values = match[1].split(',').map((part) => Number(part.trim()));
  if (values.length !== 6 || values.some((part) => !Number.isFinite(part))) return null;

  const [a, b, c, d, e, f] = values;
  if (Math.abs(b) > EPSILON || Math.abs(c) > EPSILON
    || Math.abs(e) > EPSILON || Math.abs(f) > EPSILON) return null;

  // The sibling reticle is not transformed with the video. Accept only the
  // identity matrix or an exact horizontal reflection; reject scale,
  // translation, rotation, skew and vertical reflection rather than guessing.
  if (Math.abs(a - 1) <= EPSILON && Math.abs(d - 1) <= EPSILON) return false;
  if (Math.abs(a + 1) <= EPSILON && Math.abs(d - 1) <= EPSILON) return true;
  return null;
}

function intersectNormalizedRects(
  a: ScannerNormalizedRect,
  b: ScannerNormalizedRect,
): ScannerNormalizedRect | null {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right - left <= EPSILON || bottom - top <= EPSILON) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Convert a module-owned reticle DOMRect into source-frame coordinates.
 * DOM measurement is supplied by the feature adapter; this calculation stays
 * pure and never reads browser globals or scanner/session resources.
 */
export function measureScannerPreviewRegion(
  measurement: ScannerPreviewRegionMeasurement,
): ScannerSourceScanRegion | null {
  const {
    videoRect,
    reticleRect,
    sourceWidth,
    sourceHeight,
    objectFit,
    objectPosition,
    transform,
  } = measurement;

  if (!videoRect || !reticleRect
    || !isPositiveFinite(videoRect.width)
    || !isPositiveFinite(videoRect.height)
    || !isPositiveFinite(sourceWidth)
    || !isPositiveFinite(sourceHeight)
    || ![videoRect.left, videoRect.top, reticleRect.left, reticleRect.top,
      reticleRect.width, reticleRect.height].every(Number.isFinite)
    || !isPositiveFinite(reticleRect.width)
    || !isPositiveFinite(reticleRect.height)) return null;

  const position = parseScannerObjectPosition(objectPosition);
  const mirrored = resolveHorizontalMirror(transform);
  if (!position || mirrored === null) return null;

  const geometry = {
    sourceWidth,
    sourceHeight,
    previewWidth: videoRect.width,
    previewHeight: videoRect.height,
    objectFit: objectFit as ScannerObjectFit,
    objectPosition: position,
    mirrored,
  };

  const visible = mapPreviewScanRegionToSourceFrame(
    { coordinateSpace: 'preview-content-normalized', rect: FULL_RECT },
    geometry,
  );
  if (!visible.ok) return null;

  const reticleInVideo: ScannerNormalizedRect = {
    x: (reticleRect.left - videoRect.left) / videoRect.width,
    y: (reticleRect.top - videoRect.top) / videoRect.height,
    width: reticleRect.width / videoRect.width,
    height: reticleRect.height / videoRect.height,
  };

  // Clip the module reticle to the actual image content. This excludes
  // letterbox/pillarbox areas before converting back to visible-content space.
  const clipped = intersectNormalizedRects(reticleInVideo, visible.visibleContentBounds);
  if (!clipped) return null;

  const region: ScannerNormalizedRect = {
    x: (clipped.x - visible.visibleContentBounds.x) / visible.visibleContentBounds.width,
    y: (clipped.y - visible.visibleContentBounds.y) / visible.visibleContentBounds.height,
    width: clipped.width / visible.visibleContentBounds.width,
    height: clipped.height / visible.visibleContentBounds.height,
  };

  const mapped = mapPreviewScanRegionToSourceFrame(
    { coordinateSpace: 'preview-content-normalized', rect: region },
    geometry,
  );
  return mapped.ok ? mapped.region : null;
}
