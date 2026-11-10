import type { ScannerSourceScanRegion } from './contracts';

export type ScannerRoiCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Resolve a source-frame-normalized ROI into integer source pixels.
 * Floor the leading edges and ceil the trailing edges so rounding never
 * trims pixels that belong to the measured reticle. Invalid geometry fails
 * closed; callers must not substitute a full-frame crop.
 */
export function resolveScannerRoiCrop(
  region: ScannerSourceScanRegion | null,
  frameWidth: number,
  frameHeight: number,
): ScannerRoiCrop | null {
  if (!region || region.coordinateSpace !== 'source-frame-normalized'
    || !region.rect
    || !Number.isFinite(frameWidth) || !Number.isFinite(frameHeight)
    || frameWidth <= 0 || frameHeight <= 0) return null;

  const { x, y, width, height } = region.rect;
  if (![x, y, width, height].every(Number.isFinite)
    || x < 0 || y < 0 || width <= 0 || height <= 0
    || x + width > 1 + 1e-7 || y + height > 1 + 1e-7) return null;

  const left = Math.max(0, Math.min(frameWidth, Math.floor(x * frameWidth)));
  const top = Math.max(0, Math.min(frameHeight, Math.floor(y * frameHeight)));
  const right = Math.max(left, Math.min(frameWidth, Math.ceil((x + width) * frameWidth)));
  const bottom = Math.max(top, Math.min(frameHeight, Math.ceil((y + height) * frameHeight)));
  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth < 1 || cropHeight < 1) return null;

  return { x: left, y: top, width: cropWidth, height: cropHeight };
}
