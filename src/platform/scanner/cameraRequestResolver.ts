import type { ScannerCameraRequest } from './contracts';

export type CameraStreamCompatibilityReason =
  | 'compatible'
  | 'facing-mode-mismatch'
  | 'frame-rate-exceeds-maximum';

export type CameraStreamCompatibility = {
  compatible: boolean;
  reason: CameraStreamCompatibilityReason;
};

/**
 * Convert module intent into getUserMedia constraints. Width, height and the
 * preferred frame rate remain ideals; maxFrameRate is the only hard ceiling.
 */
export function buildCameraVideoConstraints(
  request: ScannerCameraRequest,
): MediaTrackConstraints {
  return {
    facingMode: { ideal: request.facingMode },
    width: { ideal: request.preferredWidth },
    height: { ideal: request.preferredHeight },
    frameRate: {
      ideal: request.maxFrameRate === undefined
        ? request.preferredFrameRate
        : Math.min(request.preferredFrameRate, request.maxFrameRate),
      ...(request.maxFrameRate === undefined ? {} : { max: request.maxFrameRate }),
    },
    // Optional Image Capture constraint: request the camera's native continuous
    // autofocus as part of initial stream negotiation. Advanced constraints are
    // best-effort and are ignored when the device/browser does not support them.
    advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
  };
}

/**
 * Decide whether an already-running stream can satisfy a new module intent.
 * Preferred dimensions are deliberately not treated as exact requirements:
 * browsers may legitimately negotiate a smaller ideal size. A known facing
 * mismatch or a track rate above the requested hard maximum is incompatible.
 * Missing settings are treated as unknown, not as evidence of a mismatch.
 */
export function resolveCameraStreamCompatibility(
  request: ScannerCameraRequest,
  actual: Pick<MediaTrackSettings, 'facingMode' | 'frameRate'>,
): CameraStreamCompatibility {
  if (actual.facingMode && actual.facingMode !== request.facingMode) {
    return { compatible: false, reason: 'facing-mode-mismatch' };
  }

  if (request.maxFrameRate !== undefined && actual.frameRate !== undefined
    && actual.frameRate > request.maxFrameRate + 0.01) {
    return { compatible: false, reason: 'frame-rate-exceeds-maximum' };
  }

  return { compatible: true, reason: 'compatible' };
}
