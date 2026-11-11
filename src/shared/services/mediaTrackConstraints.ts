/**
 * Preserve the active MediaStreamTrack configuration when applying an
 * Image Capture extensions such as Torch.
 *
 * applyConstraints() replaces the previous custom constraint set. Reapplying
 * only an advanced Torch value can therefore release the camera's
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
    constraints.width = { ideal: settings.width };
  }
  if (constraints.height === undefined && typeof settings.height === 'number') {
    constraints.height = { ideal: settings.height };
  }
  if (constraints.frameRate === undefined && typeof settings.frameRate === 'number') {
    constraints.frameRate = { ideal: settings.frameRate, max: settings.frameRate };
  }
  if (constraints.facingMode === undefined && typeof settings.facingMode === 'string') {
    constraints.facingMode = { ideal: settings.facingMode };
  }
  if (constraints.deviceId === undefined && typeof settings.deviceId === 'string' && settings.deviceId) {
    constraints.deviceId = { ideal: settings.deviceId };
  }

  const preservedAdvanced = (constraints.advanced ?? []).filter(
    (constraint) => !(key in (constraint as Record<string, unknown>)),
  );
  constraints.advanced = [
    ...preservedAdvanced,
    { [key]: value } as unknown as MediaTrackConstraintSet,
  ];
  return constraints;
}


const trackConstraintQueues = new WeakMap<MediaStreamTrack, Promise<void>>();

/**
 * Serialize track-level camera tuning. Torch ON/OFF operations share the
 * same MediaStreamTrack; concurrent applyConstraints() calls could otherwise
 * overwrite each other's advanced settings.
 */
export async function applyTrackAdvancedConstraint(
  track: MediaStreamTrack,
  key: string,
  value: unknown,
): Promise<void> {
  const previous = trackConstraintQueues.get(track) ?? Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const constraints = buildTrackConstraintsWithAdvanced(track, key, value);
    await track.applyConstraints(constraints);
  });
  trackConstraintQueues.set(track, operation);
  try {
    await operation;
  } finally {
    if (trackConstraintQueues.get(track) === operation) {
      trackConstraintQueues.delete(track);
    }
  }
}
