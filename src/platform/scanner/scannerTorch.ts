import type { ScannerTorchState } from './contracts';

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
