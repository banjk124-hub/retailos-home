/**
 * Preserve the active MediaStreamTrack configuration when applying an
 * Image Capture extension such as continuous focus or torch.
 *
 * applyConstraints() replaces the previous custom constraint set. Reapplying
 * only an advanced focus/torch value can therefore release the camera's
 * negotiated width, height, frame rate or facing-mode constraints.
 */
export function buildTrackConstraintsWithAdvanced(
  track: MediaStreamTrack,
  key: string,
  value: unknown,
): MediaTrackConstraints {
  let existing: MediaTrackConstraints = {};
  let settings: MediaTrackSettings = {};
  try {
    existing = track.getConstraints?.() ?? {};
  } catch {
    existing = {};
  }
  try {
    settings = track.getSettings?.() ?? {};
  } catch {
    settings = {};
  }

  const constraints: MediaTrackConstraints = { ...existing };
  if (constraints.width === undefined && typeof settings.width === 'number') {
    constraints.width = { exact: settings.width };
  }
  if (constraints.height === undefined && typeof settings.height === 'number') {
    constraints.height = { exact: settings.height };
  }
  if (constraints.frameRate === undefined && typeof settings.frameRate === 'number') {
    constraints.frameRate = { exact: settings.frameRate };
  }
  if (constraints.facingMode === undefined && typeof settings.facingMode === 'string') {
    constraints.facingMode = { exact: settings.facingMode };
  }
  if (constraints.deviceId === undefined && typeof settings.deviceId === 'string' && settings.deviceId) {
    constraints.deviceId = { exact: settings.deviceId };
  }

  const preservedAdvanced = (constraints.advanced ?? []).filter(
    (constraint) => !(key in (constraint as Record<string, unknown>)),
  );
  constraints.advanced = [
    ...preservedAdvanced,
    { [key]: value } as MediaTrackConstraintSet,
  ];
  return constraints;
}
