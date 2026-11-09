import type { ScannerTorchDiagnosticSample, ScannerTorchProbeResult, ScannerTorchState } from './contracts';

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchSettings = MediaTrackSettings & { torch?: boolean };
type TorchConstraintSet = MediaTrackConstraintSet & { torch: boolean };

export function readScannerTorchState(track: MediaStreamTrack | null): ScannerTorchState {
  if (!track || track.readyState !== 'live') {
    return { supported: false, enabled: false, pending: false };
  }

  try {
    const capabilities = track.getCapabilities?.() as TorchCapabilities | undefined;
    const settings = track.getSettings?.() as TorchSettings | undefined;
    return {
      supported: capabilities?.torch === true,
      enabled: settings?.torch === true,
      pending: false,
    };
  } catch {
    return { supported: false, enabled: false, pending: false };
  }
}


/**
 * Capture one privacy-safe capability snapshot from the active video track.
 * This is observational only: it never changes camera constraints or support state.
 */
export function readScannerTorchDiagnostic(
  track: MediaStreamTrack | null,
  sample: ScannerTorchDiagnosticSample['sample'],
  startedAt: number,
): ScannerTorchDiagnosticSample {
  let capabilityApi: ScannerTorchDiagnosticSample['capabilityApi'] = 'missing';
  let settingsApi: ScannerTorchDiagnosticSample['settingsApi'] = 'missing';
  let torchCapability: ScannerTorchDiagnosticSample['torchCapability'] = 'unavailable';
  let settingsTorch: ScannerTorchDiagnosticSample['settingsTorch'] = 'unavailable';
  let facingMode: string | null = null;
  let width: number | null = null;
  let height: number | null = null;
  let frameRate: number | null = null;
  let capabilitiesErrorName: string | null = null;
  let settingsErrorName: string | null = null;

  if (track && typeof track.getCapabilities === 'function') {
    capabilityApi = 'available';
    try {
      const capabilities = track.getCapabilities() as TorchCapabilities;
      torchCapability = typeof capabilities.torch === 'boolean' ? capabilities.torch : 'not-exposed';
    } catch (cause) {
      capabilityApi = 'error';
      capabilitiesErrorName = cause instanceof Error ? cause.name : 'UnknownError';
      torchCapability = 'unavailable';
    }
  }

  if (track && typeof track.getSettings === 'function') {
    settingsApi = 'available';
    try {
      const settings = track.getSettings() as TorchSettings;
      settingsTorch = typeof settings.torch === 'boolean' ? settings.torch : 'not-exposed';
      facingMode = typeof settings.facingMode === 'string' ? settings.facingMode : null;
      width = typeof settings.width === 'number' ? settings.width : null;
      height = typeof settings.height === 'number' ? settings.height : null;
      frameRate = typeof settings.frameRate === 'number' ? settings.frameRate : null;
    } catch (cause) {
      settingsApi = 'error';
      settingsErrorName = cause instanceof Error ? cause.name : 'UnknownError';
      settingsTorch = 'unavailable';
    }
  }

  return {
    sample,
    timestamp: Date.now(),
    elapsedMs: Math.max(0, Math.round(performance.now() - startedAt)),
    capabilityApi,
    settingsApi,
    torchCapability,
    settingsTorch,
    applyConstraintsApi: Boolean(track && typeof track.applyConstraints === 'function'),
    trackReadyState: track?.readyState ?? 'missing',
    trackMuted: track?.muted ?? false,
    facingMode,
    width,
    height,
    frameRate,
    capabilitiesErrorName,
    settingsErrorName,
  };
}

function readSettingsTorch(track: MediaStreamTrack): boolean | 'not-exposed' | 'unavailable' {
  try {
    const value = (track.getSettings?.() as TorchSettings | undefined)?.torch;
    return typeof value === 'boolean' ? value : 'not-exposed';
  } catch {
    return 'unavailable';
  }
}

/** Preserve the active camera request while adding/replacing only the non-standard Torch constraint. */
function buildTorchConstraints(track: MediaStreamTrack, enabled: boolean): MediaTrackConstraints {
  let existing: MediaTrackConstraints = {};
  try {
    existing = track.getConstraints?.() ?? {};
  } catch {
    existing = {};
  }
  const settings = track.getSettings?.() as TorchSettings | undefined;
  const constraints: MediaTrackConstraints = { ...existing };
  if (constraints.width === undefined && typeof settings?.width === 'number') {
    constraints.width = { exact: settings.width };
  }
  if (constraints.height === undefined && typeof settings?.height === 'number') {
    constraints.height = { exact: settings.height };
  }
  if (constraints.frameRate === undefined && typeof settings?.frameRate === 'number') {
    constraints.frameRate = { exact: settings.frameRate };
  }
  if (constraints.facingMode === undefined && typeof settings?.facingMode === 'string') {
    constraints.facingMode = { exact: settings.facingMode };
  }
  if (constraints.deviceId === undefined && typeof settings?.deviceId === 'string' && settings.deviceId) {
    constraints.deviceId = { exact: settings.deviceId };
  }
  const preservedAdvanced = (existing.advanced ?? []).filter(
    (constraint) => !('torch' in (constraint as TorchConstraintSet)),
  );
  constraints.advanced = [...preservedAdvanced, { torch: enabled } as TorchConstraintSet];
  return constraints;
}

function errorName(cause: unknown): string {
  return cause instanceof Error ? cause.name : 'UnknownError';
}

/**
 * Explicit debug-only compatibility probe. It bypasses capability gating for one
 * short ON pulse, then attempts OFF. A resolved constraint promise is not proof
 * that the physical LED illuminated; callers must verify that visually.
 */
export async function probeScannerTorchConstraint(
  track: MediaStreamTrack | null,
  pulseDurationMs = 1200,
): Promise<ScannerTorchProbeResult> {
  const startedAt = performance.now();
  const settingsTorchBefore = track ? readSettingsTorch(track) : 'unavailable';
  const unavailable = (): ScannerTorchProbeResult => ({
    status: 'unavailable',
    pulseDurationMs: 0,
    onAccepted: false,
    onErrorName: null,
    offAttempted: false,
    offAccepted: null,
    offErrorName: null,
    settingsTorchBefore,
    settingsTorchAfter: track ? readSettingsTorch(track) : 'unavailable',
    trackReadyState: track?.readyState ?? 'missing',
  });

  if (!track || track.readyState !== 'live' || typeof track.applyConstraints !== 'function') {
    return unavailable();
  }

  let onAccepted = false;
  let onErrorName: string | null = null;
  try {
    await track.applyConstraints(buildTorchConstraints(track, true));
    onAccepted = true;
  } catch (cause) {
    onErrorName = errorName(cause);
  }

  let offAttempted = false;
  let offAccepted: boolean | null = null;
  let offErrorName: string | null = null;
  if (onAccepted) {
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, pulseDurationMs)));
    if (track.readyState === 'live') {
      offAttempted = true;
      try {
        await track.applyConstraints(buildTorchConstraints(track, false));
        offAccepted = true;
      } catch (cause) {
        offAccepted = false;
        offErrorName = errorName(cause);
      }
    }
  }

  return {
    status: 'completed',
    pulseDurationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    onAccepted,
    onErrorName,
    offAttempted,
    offAccepted,
    offErrorName,
    settingsTorchBefore,
    settingsTorchAfter: readSettingsTorch(track),
    trackReadyState: track.readyState,
  };
}

/** Apply the non-standard MediaStreamTrack torch constraint when advertised by the track. */
export async function applyScannerTorch(
  track: MediaStreamTrack,
  enabled: boolean,
): Promise<ScannerTorchState> {
  const current = readScannerTorchState(track);
  if (!current.supported) return current;

  try {
    const constraints = buildTorchConstraints(track, enabled);
    await track.applyConstraints(constraints);
    const after = readScannerTorchState(track);
    return {
      supported: true,
      enabled: typeof (track.getSettings?.() as TorchSettings | undefined)?.torch === 'boolean'
        ? after.enabled
        : enabled,
      pending: false,
    };
  } catch {
    return {
      ...readScannerTorchState(track),
      supported: true,
      error: enabled
        ? 'Không thể bật đèn flash trên camera này.'
        : 'Không thể tắt đèn flash trên camera này.',
    };
  }
}
