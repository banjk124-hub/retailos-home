import { getSafeCameraSettings, requestContinuousAutofocus } from './cameraDiagnostics';
import { DEFAULT_SCANNER_CAMERA_REQUEST, type ScannerCameraRequest } from '../../platform/scanner/contracts';
import { buildCameraVideoConstraints, resolveCameraStreamCompatibility } from '../../platform/scanner/cameraRequestResolver';

let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;
let requestGeneration = 0;
let activeLeaseCount = 0;
const trackEndedListeners = new Set<(stream: MediaStream) => void>();

export type CameraStreamLease = {
  readonly stream: MediaStream;
  release(): void;
};

/**
 * Starts camera permission/acquisition from a user interaction and transfers
 * the resulting lease to one scanner session after its video element mounts.
 * An unclaimed request can be cancelled without leaking a late camera lease.
 */
export type CameraLeaseRequest = {
  /** Immutable module intent retained across the lease handoff and recovery. */
  readonly cameraRequest: ScannerCameraRequest;
  claim(): Promise<CameraStreamLease>;
  cancel(): void;
};

export function requestCameraLease(
  cameraRequest: ScannerCameraRequest = DEFAULT_SCANNER_CAMERA_REQUEST,
): CameraLeaseRequest {
  const requestSnapshot = Object.freeze({ ...cameraRequest });
  const promise = acquireCameraLease(requestSnapshot);
  let claimed = false;
  let cancelled = false;

  // The owning UI may close before the scanner component mounts. Mark the
  // rejection as observed while preserving it for the eventual session claim.
  void promise.catch(() => undefined);

  return {
    cameraRequest: requestSnapshot,
    claim: () => {
      if (cancelled) {
        return Promise.reject(new DOMException('Camera request was cancelled before handoff.', 'AbortError'));
      }
      if (claimed) {
        return Promise.reject(new Error('Camera lease request has already been claimed.'));
      }
      claimed = true;
      return promise;
    },
    cancel: () => {
      if (claimed || cancelled) return;
      cancelled = true;
      void promise.then((lease) => lease.release()).catch(() => undefined);
    },
  };
}


function assertStreamCompatible(stream: MediaStream, cameraRequest: ScannerCameraRequest): void {
  const track = stream.getVideoTracks().find((candidate) => candidate.readyState === 'live');
  const actualSettings = track?.getSettings?.() ?? {};
  const compatibility = resolveCameraStreamCompatibility(cameraRequest, actualSettings);
  if (compatibility.compatible) return;

  const error = new Error(
    `Camera đang được phiên quét khác sử dụng với cấu hình không tương thích (${compatibility.reason}). Hãy đóng phiên đó trước khi mở camera theo yêu cầu mới.`,
  );
  error.name = 'OverconstrainedError';
  throw error;
}

async function acquireSharedStream(
  cameraRequest: ScannerCameraRequest,
): Promise<{ stream: MediaStream; generation: number }> {
  if (activeStream?.getTracks().some((track) => track.readyState === 'live')) {
    try {
      assertStreamCompatible(activeStream, cameraRequest);
      return { stream: activeStream, generation: requestGeneration };
    } catch (error) {
      if (activeLeaseCount > 0 || pendingRequest) throw error;
      const staleStream = activeStream;
      activeStream = null;
      staleStream.getTracks().forEach((track) => track.stop());
    }
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
  }

  const generation = requestGeneration;
  if (!pendingRequest) {
    const getUserMediaStartedAt = performance.now();
    const request = navigator.mediaDevices.getUserMedia({
      audio: false,
      video: buildCameraVideoConstraints(cameraRequest),
    }).then(async (stream) => {
      console.info('[RetailOS Scanner] Performance stage', {
        stage: 'get_user_media_ms',
        durationMs: Number((performance.now() - getUserMediaStartedAt).toFixed(1)),
      });
      if (generation !== requestGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        throw new DOMException('Camera request was superseded.', 'AbortError');
      }

      activeStream = stream;
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.some((track) => track.readyState === 'live')) {
        activeStream = null;
        stream.getTracks().forEach((track) => track.stop());
        throw new DOMException('Camera track ended before startup completed.', 'NotReadableError');
      }

      // Register lifecycle monitoring before optional camera tuning. A track
      // ending must be observable even while an autofocus request is pending.
      videoTracks.forEach((track) => {
        track.addEventListener('ended', () => {
          if (activeStream !== stream) return;
          const hasLiveVideoTrack = stream.getVideoTracks()
            .some((videoTrack) => videoTrack.readyState === 'live');
          if (hasLiveVideoTrack) return;
          activeStream = null;
          activeLeaseCount = 0;
          trackEndedListeners.forEach((listener) => listener(stream));
        }, { once: true });
      });

      console.info('[RetailOS Scanner] Camera settings', getSafeCameraSettings(videoTracks[0]));

      // Autofocus is an optional enhancement, not part of camera acquisition.
      // Start it in the background so a slow applyConstraints() cannot delay
      // delivery of the live stream to the scanner preview.
      const autofocusStartedAt = performance.now();
      void Promise.all(videoTracks.map(requestContinuousAutofocus))
        .then((focusResults) => {
          if (generation !== requestGeneration || activeStream !== stream) return;
          const focusResult = focusResults[0] ?? {
            status: 'unavailable' as const,
            supportedModes: [],
            durationMs: 0,
          };
          console.info('[RetailOS Scanner] Performance stage', {
            stage: 'optional_autofocus_ms',
            durationMs: Number((performance.now() - autofocusStartedAt).toFixed(1)),
          });
          console.info('[RetailOS Scanner] Camera focus', {
            focusStatus: focusResult.status,
            focusModes: focusResult.supportedModes.join(','),
            focusRequestMs: focusResult.durationMs,
            focusErrorName: focusResult.errorName,
          });
        })
        .catch((error: unknown) => {
          // requestContinuousAutofocus already normalizes expected failures;
          // this guard protects acquisition from any unexpected diagnostic fault.
          console.warn('[RetailOS Scanner] Optional autofocus diagnostic failed:', error);
        });

      return stream;
    }).finally(() => {
      if (pendingRequest === request) pendingRequest = null;
    });
    pendingRequest = request;
  }

  const stream = await pendingRequest;
  if (generation !== requestGeneration || activeStream !== stream) {
    throw new DOMException('Camera request was superseded.', 'AbortError');
  }
  // A pending getUserMedia request may be shared only after its actual track
  // settings prove compatible with this caller's intent.
  assertStreamCompatible(stream, cameraRequest);
  return { stream, generation };
}

/**
 * Each scanner session receives a lease on the shared stream. Releasing an
 * obsolete session decrements only its own lease and cannot stop a stream
 * still leased by a newer session.
 */
export async function acquireCameraLease(
  cameraRequest: ScannerCameraRequest = DEFAULT_SCANNER_CAMERA_REQUEST,
): Promise<CameraStreamLease> {
  const { stream, generation } = await acquireSharedStream(cameraRequest);
  if (generation !== requestGeneration || activeStream !== stream) {
    throw new DOMException('Camera request was superseded.', 'AbortError');
  }

  activeLeaseCount += 1;
  let released = false;
  return {
    stream,
    release: () => {
      if (released) return;
      released = true;
      if (generation !== requestGeneration || activeStream !== stream) return;
      activeLeaseCount = Math.max(0, activeLeaseCount - 1);
      if (activeLeaseCount > 0) return;
      activeStream = null;
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

export function subscribeCameraTrackEnded(listener: (stream: MediaStream) => void): () => void {
  trackEndedListeners.add(listener);
  return () => trackEndedListeners.delete(listener);
}

/**
 * Global invalidation is reserved for app-level logout/forced shutdown.
 * Scanner sessions must release their own CameraStreamLease instead.
 */
export function releaseCameraStream(): void {
  requestGeneration += 1;
  pendingRequest = null;
  activeLeaseCount = 0;
  const stream = activeStream;
  activeStream = null;
  stream?.getTracks().forEach((track) => track.stop());
}

export function hasActiveCameraStream(): boolean {
  return Boolean(activeStream?.getTracks().some((track) => track.readyState === 'live'));
}
