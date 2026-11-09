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

/** Apply the non-standard MediaStreamTrack torch constraint when advertised by the track. */
export async function applyScannerTorch(
  track: MediaStreamTrack,
  enabled: boolean,
): Promise<ScannerTorchState> {
  const current = readScannerTorchState(track);
  if (!current.supported) return current;

  try {
    const constraints: MediaTrackConstraints = {
      advanced: [{ torch: enabled } as TorchConstraintSet],
    };
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
