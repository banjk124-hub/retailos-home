import type {
  ScannerNormalizedRect,
  ScannerPreviewScanRegion,
  ScannerSourceScanRegion,
} from './contracts';

export type ScannerObjectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

export type ScannerObjectPosition = {
  /** CSS object-position resolved as a fraction of free horizontal space. */
  x: number;
  /** CSS object-position resolved as a fraction of free vertical space. */
  y: number;
};

export type ScannerPreviewGeometry = {
  /** Intrinsic dimensions of the current decoded camera frame (videoWidth/videoHeight). */
  sourceWidth: number;
  sourceHeight: number;
  /** CSS-pixel dimensions of the video element's content box. */
  previewWidth: number;
  previewHeight: number;
  objectFit: ScannerObjectFit;
  /** Resolved object-position fractions: 0=start, 0.5=center, 1=end. */
  objectPosition: ScannerObjectPosition;
  /** True when the visible video element is horizontally mirrored with CSS. */
  mirrored: boolean;
};

export type ScannerGeometryMappingErrorCode =
  | 'invalid-region'
  | 'invalid-geometry'
  | 'no-visible-content'
  | 'mapped-region-out-of-bounds';

export type ScannerGeometryMappingResult =
  | {
      ok: true;
      region: ScannerSourceScanRegion;
      /** Visible image-content bounds relative to the video element box. */
      visibleContentBounds: ScannerNormalizedRect;
    }
  | {
      ok: false;
      error: ScannerGeometryMappingErrorCode;
      message: string;
    };

/**
 * Resolve the common computed CSS object-position forms into free-space
 * fractions. Unsupported length/calc syntax returns null; callers must not
 * silently substitute center when the actual presentation value is unknown.
 */
export function parseScannerObjectPosition(value: string): ScannerObjectPosition | null {
  const tokens = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) return null;

  const parseAxis = (token: string, axis: 'x' | 'y'): number | null => {
    if (token === 'center') return 0.5;
    if (axis === 'x' && token === 'left') return 0;
    if (axis === 'x' && token === 'right') return 1;
    if (axis === 'y' && token === 'top') return 0;
    if (axis === 'y' && token === 'bottom') return 1;
    const percentage = token.match(/^(-?(?:\d+|\d*\.\d+))%$/);
    if (!percentage) return null;
    const fraction = Number(percentage[1]) / 100;
    return Number.isFinite(fraction) && fraction >= 0 && fraction <= 1 ? fraction : null;
  };

  if (tokens.length === 1) {
    const token = tokens[0];
    if (token === 'top' || token === 'bottom') {
      const y = parseAxis(token, 'y');
      return y === null ? null : { x: 0.5, y };
    }
    const x = parseAxis(token, 'x');
    return x === null ? null : { x, y: 0.5 };
  }

  let [horizontal, vertical] = tokens;
  const firstIsVertical = horizontal === 'top' || horizontal === 'bottom';
  const secondIsHorizontal = vertical === 'left' || vertical === 'right';
  if (firstIsVertical && secondIsHorizontal) {
    [horizontal, vertical] = [vertical, horizontal];
  }

  const x = parseAxis(horizontal, 'x');
  const y = parseAxis(vertical, 'y');
  return x === null || y === null ? null : { x, y };
}

/** Inputs that can change the preview-to-source coordinate transform. */
export type ScannerGeometrySignatureInput = {
  sourceWidth: number;
  sourceHeight: number;
  videoRect: { left: number; top: number; width: number; height: number };
  reticleRect: { left: number; top: number; width: number; height: number };
  objectFit: string;
  objectPosition: string;
  transform: string;
  viewportWidth: number;
  viewportHeight: number;
  visualViewportOffsetLeft: number;
  visualViewportOffsetTop: number;
  visualViewportScale: number;
  devicePixelRatio: number;
};

/**
 * Stable, privacy-safe fingerprint of geometry inputs only. It deliberately
 * excludes device IDs, camera IDs, URLs, barcode data and user information.
 * Rounding suppresses insignificant sub-pixel observer noise while preserving
 * meaningful layout/source changes.
 */
export function createScannerGeometrySignature(input: ScannerGeometrySignatureInput): string | null {
  if (!input || typeof input !== 'object') return null;
  const numbers = [
    input.sourceWidth, input.sourceHeight,
    input.videoRect?.left, input.videoRect?.top, input.videoRect?.width, input.videoRect?.height,
    input.reticleRect?.left, input.reticleRect?.top, input.reticleRect?.width, input.reticleRect?.height,
    input.viewportWidth, input.viewportHeight,
    input.visualViewportOffsetLeft, input.visualViewportOffsetTop,
    input.visualViewportScale, input.devicePixelRatio,
  ];
  if (!numbers.every(Number.isFinite)
    || numbers.some((value) => value < 0)
    || input.sourceWidth <= 0 || input.sourceHeight <= 0
    || input.videoRect.width <= 0 || input.videoRect.height <= 0
    || input.reticleRect.width <= 0 || input.reticleRect.height <= 0
    || input.viewportWidth <= 0 || input.viewportHeight <= 0
    || input.visualViewportScale <= 0 || input.devicePixelRatio <= 0
    || !['fill', 'contain', 'cover', 'none', 'scale-down'].includes(input.objectFit)
    || parseScannerObjectPosition(input.objectPosition) === null
    || resolveGeometryMirror(input.transform) === null) return null;

  const rounded = numbers.map((value) => Number(value.toFixed(3)).toString());
  return [
    'geometry-v1',
    ...rounded,
    input.objectFit,
    input.objectPosition.trim().toLowerCase().replace(/\s+/g, ' '),
    input.transform.trim().toLowerCase(),
  ].join('|');
}

function resolveGeometryMirror(transform: string): boolean | null {
  const value = transform.trim().toLowerCase();
  if (!value || value === 'none') return false;
  const match = value.match(/^matrix\(([^)]+)\)$/);
  if (!match) return null;
  const values = match[1].split(',').map((part) => Number(part.trim()));
  if (values.length !== 6 || values.some((part) => !Number.isFinite(part))) return null;
  const [a, b, c, d, e, f] = values;
  if (Math.abs(b) > 1e-7 || Math.abs(c) > 1e-7 || Math.abs(e) > 1e-7 || Math.abs(f) > 1e-7) return null;
  if (Math.abs(a - 1) <= 1e-7 && Math.abs(d - 1) <= 1e-7) return false;
  if (Math.abs(a + 1) <= 1e-7 && Math.abs(d - 1) <= 1e-7) return true;
  return null;
}

export type ScannerGeometryRevision = {
  version: number;
  signature: string;
};

export class ScannerGeometryRevisionTracker {
  private version = 0;
  private signature: string | null = null;

  update(signature: string | null): ScannerGeometryRevision | null {
    if (!signature) {
      if (this.signature !== null) {
        this.signature = null;
        this.version += 1;
      }
      return null;
    }
    if (signature !== this.signature) {
      this.signature = signature;
      this.version += 1;
    }
    return { version: this.version, signature: this.signature };
  }

  invalidate(): number {
    // Explicit invalidation advances the epoch to reject delayed work even
    // when the tracker is already invalid (e.g. observer lifecycle teardown).
    this.signature = null;
    this.version += 1;
    return this.version;
  }

  getVersion(): number { return this.version; }
}

type PixelRect = { x: number; y: number; width: number; height: number };

const EPSILON = 1e-7;

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNormalizedRect(rect: ScannerNormalizedRect): boolean {
  return Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.x >= 0
    && rect.y >= 0
    && rect.width > 0
    && rect.height > 0
    && rect.x + rect.width <= 1 + EPSILON
    && rect.y + rect.height <= 1 + EPSILON;
}

function intersectWithViewport(rect: PixelRect, width: number, height: number): PixelRect {
  const left = Math.max(0, rect.x);
  const top = Math.max(0, rect.y);
  const right = Math.min(width, rect.x + rect.width);
  const bottom = Math.min(height, rect.y + rect.height);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function getRenderedImageRect(geometry: ScannerPreviewGeometry): PixelRect {
  const { sourceWidth, sourceHeight, previewWidth, previewHeight, objectFit, objectPosition } = geometry;
  const containScale = Math.min(previewWidth / sourceWidth, previewHeight / sourceHeight);
  const coverScale = Math.max(previewWidth / sourceWidth, previewHeight / sourceHeight);

  let scaleX = 1;
  let scaleY = 1;

  switch (objectFit) {
    case 'fill':
      scaleX = previewWidth / sourceWidth;
      scaleY = previewHeight / sourceHeight;
      break;
    case 'contain':
      scaleX = containScale;
      scaleY = containScale;
      break;
    case 'cover':
      scaleX = coverScale;
      scaleY = coverScale;
      break;
    case 'none':
      // For video replaced elements, the default object size is its intrinsic CSS-pixel size.
      break;
    case 'scale-down': {
      const scale = Math.min(1, containScale);
      scaleX = scale;
      scaleY = scale;
      break;
    }
    default:
      throw new Error('Unsupported object-fit value.');
  }

  const renderedWidth = sourceWidth * scaleX;
  const renderedHeight = sourceHeight * scaleY;
  return {
    x: (previewWidth - renderedWidth) * objectPosition.x,
    y: (previewHeight - renderedHeight) * objectPosition.y,
    width: renderedWidth,
    height: renderedHeight,
  };
}

/**
 * Maps a feature-owned rectangle in the visible preview image content to the
 * unrotated camera source frame. This is a pure calculation: it does not read
 * the DOM, acquire camera resources, or mutate scanner/session state.
 */
export function mapPreviewScanRegionToSourceFrame(
  region: ScannerPreviewScanRegion,
  geometry: ScannerPreviewGeometry,
): ScannerGeometryMappingResult {
  if (region?.coordinateSpace !== 'preview-content-normalized'
    || !region.rect
    || !isNormalizedRect(region.rect)) {
    return {
      ok: false,
      error: 'invalid-region',
      message: 'Preview scan region must be a finite, positive normalized rectangle inside [0, 1].',
    };
  }

  if (!geometry || typeof geometry !== 'object') {
    return {
      ok: false,
      error: 'invalid-geometry',
      message: 'Preview geometry is required.',
    };
  }

  const { sourceWidth, sourceHeight, previewWidth, previewHeight, objectFit, objectPosition, mirrored } = geometry;
  if (!isFinitePositive(sourceWidth)
    || !isFinitePositive(sourceHeight)
    || !isFinitePositive(previewWidth)
    || !isFinitePositive(previewHeight)
    || !objectPosition
    || !Number.isFinite(objectPosition.x)
    || !Number.isFinite(objectPosition.y)
    || objectPosition.x < 0
    || objectPosition.x > 1
    || objectPosition.y < 0
    || objectPosition.y > 1
    || typeof mirrored !== 'boolean'
    || !['fill', 'contain', 'cover', 'none', 'scale-down'].includes(objectFit)) {
    return {
      ok: false,
      error: 'invalid-geometry',
      message: 'Preview geometry requires positive finite dimensions, a supported object-fit, normalized object-position, and an explicit mirror state.',
    };
  }

  let renderedImage: PixelRect;
  try {
    renderedImage = getRenderedImageRect(geometry);
  } catch {
    return {
      ok: false,
      error: 'invalid-geometry',
      message: 'Unable to resolve the rendered video image rectangle.',
    };
  }

  const visibleContent = intersectWithViewport(renderedImage, previewWidth, previewHeight);
  if (!isFinitePositive(visibleContent.width) || !isFinitePositive(visibleContent.height)) {
    return {
      ok: false,
      error: 'no-visible-content',
      message: 'The rendered video image does not intersect the preview viewport.',
    };
  }

  const visualContentX = mirrored
    ? previewWidth - visibleContent.x - visibleContent.width
    : visibleContent.x;
  const visibleContentBounds: ScannerNormalizedRect = {
    x: visualContentX / previewWidth,
    y: visibleContent.y / previewHeight,
    width: visibleContent.width / previewWidth,
    height: visibleContent.height / previewHeight,
  };

  // The module region is relative to the actually visible image content, not
  // the outer preview element or any letterbox area.
  const visualLeft = visualContentX + region.rect.x * visibleContent.width;
  const visualTop = visibleContent.y + region.rect.y * visibleContent.height;
  const mappedWidthPx = region.rect.width * visibleContent.width;
  const mappedHeightPx = region.rect.height * visibleContent.height;

  // Undo a CSS scaleX(-1) presentation transform before mapping to source pixels.
  const sourceOrientedLeft = mirrored
    ? previewWidth - (visualLeft + mappedWidthPx)
    : visualLeft;
  const sourceOrientedTop = visualTop;

  const left = (sourceOrientedLeft - renderedImage.x) / renderedImage.width;
  const top = (sourceOrientedTop - renderedImage.y) / renderedImage.height;
  const right = (sourceOrientedLeft + mappedWidthPx - renderedImage.x) / renderedImage.width;
  const bottom = (sourceOrientedTop + mappedHeightPx - renderedImage.y) / renderedImage.height;

  const clampUnit = (value: number) => Math.min(1, Math.max(0, value));
  const sourceRect: ScannerNormalizedRect = {
    x: clampUnit(left),
    y: clampUnit(top),
    width: clampUnit(right) - clampUnit(left),
    height: clampUnit(bottom) - clampUnit(top),
  };

  if (!isNormalizedRect(sourceRect)) {
    return {
      ok: false,
      error: 'mapped-region-out-of-bounds',
      message: 'Mapped scan region is empty or outside the camera source frame.',
    };
  }

  return {
    ok: true,
    region: {
      coordinateSpace: 'source-frame-normalized',
      rect: sourceRect,
    },
    visibleContentBounds,
  };
}
