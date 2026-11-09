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

  const { sourceWidth, sourceHeight, previewWidth, previewHeight, objectFit, objectPosition, mirrored } = geometry ?? {};
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
