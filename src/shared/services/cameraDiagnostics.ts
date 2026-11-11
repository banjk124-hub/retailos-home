export type SafeCameraSettings = {
  width?: number;
  height?: number;
  frameRate?: number;
  facingMode?: string;
  focusMode?: string;
  focusModes?: string[];
  exposureMode?: string;
  whiteBalanceMode?: string;
};

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
};

/**
 * Read camera focus capability and current mode without changing camera state.
 * Unsupported or unexposed controls are diagnostic unknowns, not failures:
 * the device retains its own native autofocus behavior.
 */
export function getSafeCameraSettings(track: MediaStreamTrack): SafeCameraSettings {
  let settings: MediaTrackSettings & {
    focusMode?: string;
    exposureMode?: string;
    whiteBalanceMode?: string;
  } = {};
  let capabilities: FocusCapabilities | undefined;
  try {
    settings = track.getSettings() as typeof settings;
  } catch {
    settings = {};
  }
  try {
    capabilities = typeof track.getCapabilities === 'function'
      ? track.getCapabilities() as FocusCapabilities
      : undefined;
  } catch {
    capabilities = undefined;
  }
  try {
    const safeSettings: SafeCameraSettings = {};
    if (typeof settings.width === 'number') safeSettings.width = settings.width;
    if (typeof settings.height === 'number') safeSettings.height = settings.height;
    if (typeof settings.frameRate === 'number') safeSettings.frameRate = settings.frameRate;
    if (typeof settings.facingMode === 'string') safeSettings.facingMode = settings.facingMode;
    if (typeof settings.focusMode === 'string') safeSettings.focusMode = settings.focusMode;
    if (Array.isArray(capabilities?.focusMode)) {
      safeSettings.focusModes = capabilities.focusMode.filter((mode): mode is string => typeof mode === 'string');
    }
    if (typeof settings.exposureMode === 'string') safeSettings.exposureMode = settings.exposureMode;
    if (typeof settings.whiteBalanceMode === 'string') safeSettings.whiteBalanceMode = settings.whiteBalanceMode;
    return safeSettings;
  } catch {
    return {};
  }
}
