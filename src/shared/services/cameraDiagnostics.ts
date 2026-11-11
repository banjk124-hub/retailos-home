export type CameraFocusStatus =
  | 'continuous-requested'
  | 'unsupported'
  | 'unavailable'
  | 'failed';

export type CameraFocusResult = {
  status: CameraFocusStatus;
  supportedModes: string[];
  durationMs: number;
  actualMode?: string;
  errorName?: string;
};

export type SafeCameraSettings = {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
};

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
};
type FocusSettings = MediaTrackSettings & { focusMode?: string };

/**
 * Request continuous autofocus only when the browser explicitly exposes it.
 * A successful constraint request is not proof that the lens has physically
 * reached focus; callers must keep that distinction in diagnostics/UI.
 */
export async function requestContinuousAutofocus(
  track: MediaStreamTrack,
): Promise<CameraFocusResult> {
  const startedAt = performance.now();
  let supportedModes: string[] = [];
  try {
    if (typeof track.getCapabilities !== 'function' || typeof track.applyConstraints !== 'function') {
      return {
        status: 'unavailable',
        supportedModes: [],
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
      };
    }

    const capabilities = track.getCapabilities() as FocusCapabilities;
    supportedModes = Array.isArray(capabilities.focusMode)
      ? capabilities.focusMode.filter((mode): mode is string => typeof mode === 'string')
      : [];

    if (!supportedModes.includes('continuous')) {
      return {
        status: supportedModes.length ? 'unsupported' : 'unavailable',
        supportedModes,
        durationMs: Number((performance.now() - startedAt).toFixed(1)),
      };
    }

    // applyConstraints replaces the active custom constraint set. Preserve
    // the negotiated camera dimensions, frame rate, facing mode and device.
    await track.applyConstraints(
      buildTrackConstraintsWithAdvanced(track, 'focusMode', 'continuous'),
    );
    const settings = track.getSettings?.() as FocusSettings | undefined;

    return {
      status: 'continuous-requested',
      supportedModes,
      durationMs: Number((performance.now() - startedAt).toFixed(1)),
      actualMode: typeof settings?.focusMode === 'string' ? settings.focusMode : undefined,
    };
  } catch (error) {
    return {
      status: 'failed',
      supportedModes,
      durationMs: Number((performance.now() - startedAt).toFixed(1)),
      actualMode: (() => {
        try {
          const mode = (track.getSettings?.() as FocusSettings | undefined)?.focusMode;
          return typeof mode === 'string' ? mode : undefined;
        } catch { return undefined; }
      })(),
      errorName: error instanceof DOMException || error instanceof Error ? error.name : 'UnknownError',
    };
  }
}

/** Return camera settings safe for diagnostics; never expose deviceId or labels. */
export function getSafeCameraSettings(track: MediaStreamTrack): SafeCameraSettings {
  try {
    const settings = track.getSettings() as MediaTrackSettings & {
      focusMode?: string;
      exposureMode?: string;
      whiteBalanceMode?: string;
    };
    const safeSettings: SafeCameraSettings = {};
    if (typeof settings.width === 'number') safeSettings.width = settings.width;
    if (typeof settings.height === 'number') safeSettings.height = settings.height;
    if (typeof settings.frameRate === 'number') safeSettings.frameRate = settings.frameRate;
    if (typeof settings.facingMode === 'string') safeSettings.facingMode = settings.facingMode;
    if (typeof settings.focusMode === 'string') safeSettings.focusMode = settings.focusMode;
    if (typeof settings.exposureMode === 'string') safeSettings.exposureMode = settings.exposureMode;
    if (typeof settings.whiteBalanceMode === 'string') safeSettings.whiteBalanceMode = settings.whiteBalanceMode;
    return safeSettings;
  } catch {
    return {};
  }
}
