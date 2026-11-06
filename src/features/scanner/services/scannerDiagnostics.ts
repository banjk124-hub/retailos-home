export type ScannerDiagnosticsSession = {
  id: number;
  startedAt: number;
  firstResultAt: number | null;
  finished: boolean;
};

let nextSessionId = 1;

/** Expose only non-identifying camera characteristics; omit deviceId/groupId. */
export function getSafeCameraTrackSettings(track: MediaStreamTrack | undefined): Record<string, unknown> | null {
  if (!track) return null;
  const settings = track.getSettings();
  return {
    width: settings.width ?? null,
    height: settings.height ?? null,
    frameRate: settings.frameRate ?? null,
    facingMode: settings.facingMode ?? null,
    aspectRatio: settings.aspectRatio ?? null,
  };
}


function elapsedSince(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

/**
 * Lightweight, session-scoped scanner telemetry.
 * Never records barcode contents, product data, or user identity.
 */
export function beginScannerDiagnostics(): ScannerDiagnosticsSession {
  const session: ScannerDiagnosticsSession = {
    id: nextSessionId++,
    startedAt: performance.now(),
    firstResultAt: null,
    finished: false,
  };

  console.info('[RetailOS Scanner]', {
    event: 'session-start',
    sessionId: session.id,
    visibilityState: document.visibilityState,
  });

  return session;
}

export function markScannerDiagnostics(
  session: ScannerDiagnosticsSession,
  event: string,
  details: Record<string, unknown> = {},
): void {
  if (session.finished) return;

  console.info('[RetailOS Scanner]', {
    event,
    sessionId: session.id,
    elapsedMs: elapsedSince(session.startedAt),
    ...details,
  });
}

export function recordFirstScannerResult(
  session: ScannerDiagnosticsSession,
  details: Record<string, unknown> = {},
): void {
  if (session.finished || session.firstResultAt !== null) return;

  session.firstResultAt = performance.now();
  markScannerDiagnostics(session, 'first-valid-result', {
    firstResultLatencyMs: elapsedSince(session.startedAt),
    ...details,
  });
}

export function finishScannerDiagnostics(
  session: ScannerDiagnosticsSession | null,
  reason: string,
): void {
  if (!session || session.finished) return;

  session.finished = true;
  console.info('[RetailOS Scanner]', {
    event: 'session-end',
    sessionId: session.id,
    reason,
    elapsedMs: elapsedSince(session.startedAt),
    firstResultLatencyMs: session.firstResultAt === null
      ? null
      : Math.round((session.firstResultAt - session.startedAt) * 10) / 10,
    hadValidResult: session.firstResultAt !== null,
  });
}
