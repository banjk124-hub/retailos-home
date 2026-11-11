import { getSafeCameraSettings, requestContinuousAutofocus, type CameraFocusResult } from './cameraDiagnostics';
import { DEFAULT_SCANNER_CAMERA_REQUEST, type ScannerCameraRequest } from '../../platform/scanner/contracts';
import { buildCameraVideoConstraints, resolveCameraStreamCompatibility } from '../../platform/scanner/cameraRequestResolver';

let activeStream: MediaStream | null = null;
let activeCameraRequest: ScannerCameraRequest | null = null;
let pendingRequest: Promise<MediaStream> | null = null;
let pendingCameraRequest: ScannerCameraRequest | null = null;
let requestGeneration = 0;
let activeLeaseCount = 0;
const focusPreparationByTrack = new WeakMap<MediaStreamTrack, Promise<CameraFocusResult>>();
const focusRecoveryByTrack = new WeakMap<MediaStreamTrack, Promise<CameraFocusResult>>();
const trackEndedListeners = new Set<(stream: MediaStream) => void>();

export type CameraStreamLease = {
  readonly stream: MediaStream;
  /** Apply optional camera tuning only after the owning video has a fresh frame. */
  prepareForScanning(): Promise<CameraFocusResult[]>;
  /** Reassert continuous autofocus after the scanner detects sustained image defocus. */
  reapplyContinuousAutofocus(): Promise<CameraFocusResult[]>;
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


function sameCameraRequest(a: ScannerCameraRequest | null, b: ScannerCameraRequest): boolean {
  return Boolean(a
    && a.facingMode === b.facingMode
    && a.preferredWidth === b.preferredWidth
    && a.preferredHeight === b.preferredHeight
    && a.preferredFrameRate === b.preferredFrameRate
    && a.maxFrameRate === b.maxFrameRate);
}

function assertStreamCompatible(
  stream: MediaStream,
  cameraRequest: ScannerCameraRequest,
  allowNegotiatedFacingMismatch = false,
): void {
  const track = stream.getVideoTracks().find((candidate) => candidate.readyState === 'live');
  const actualSettings = track?.getSettings?.() ?? {};
  const compatibility = resolveCameraStreamCompatibility(cameraRequest, actualSettings);
  if (compatibility.compatible
    || (allowNegotiatedFacingMismatch && compatibility.reason === 'facing-mode-mismatch')) return;

  const error = new Error(
    `Camera hiện tại không đáp ứng yêu cầu của phiên quét (${compatibility.reason}). Hãy đóng phiên đang sử dụng camera hoặc thử lại với cấu hình phù hợp.`,
  );
  error.name = 'OverconstrainedError';
  throw error;
}

async function acquireSharedStream(
  cameraRequest: ScannerCameraRequest,
): Promise<{ stream: MediaStream; generation: number }> {
  if (activeStream?.getTracks().some((track) => track.readyState === 'live')) {
    try {
      // The initiating intent may accept the browser's negotiated facing-mode
      // best effort, but its hard frame-rate ceiling still applies. Different
      // intents must satisfy actual settings before they can share the stream.
      assertStreamCompatible(
        activeStream,
        cameraRequest,
        sameCameraRequest(activeCameraRequest, cameraRequest),
      );
      return { stream: activeStream, generation: requestGeneration };
    } catch (error) {
      if (activeLeaseCount > 0 || pendingRequest) throw error;
      const staleStream = activeStream;
      activeStream = null;
      activeCameraRequest = null;
      staleStream.getTracks().forEach((track) => track.stop());
    }
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
  }

  const generation = requestGeneration;
  if (!pendingRequest) {
    const getUserMediaStartedAt = performance.now();
    pendingCameraRequest = cameraRequest;
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
      activeCameraRequest = cameraRequest;
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.some((track) => track.readyState === 'live')) {
        activeStream = null;
        activeCameraRequest = null;
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
          activeCameraRequest = null;
          activeLeaseCount = 0;
          trackEndedListeners.forEach((listener) => listener(stream));
        }, { once: true });
      });

      console.info('[RetailOS Scanner] Camera settings', getSafeCameraSettings(videoTracks[0]));

      // Focus tuning is deferred until the owning video element is playing
      // and has produced a fresh frame. Capabilities may not be complete earlier.

      return stream;
    }).finally(() => {
      if (pendingRequest === request) {
        pendingRequest = null;
        pendingCameraRequest = null;
      }
    });
    pendingRequest = request;
  }

  const sharedRequest = pendingRequest;
  const sharedRequestIntent = pendingCameraRequest;
  const stream = await sharedRequest;
  if (generation !== requestGeneration || activeStream !== stream) {
    throw new DOMException('Camera request was superseded.', 'AbortError');
  }
  // The initiating caller accepts a negotiated facing-mode ideal, but every
  // caller must respect its hard frame-rate ceiling. Other intents are checked
  // against all known actual settings before sharing the pending stream.
  const isInitiatingIntent = sameCameraRequest(sharedRequestIntent, cameraRequest);
  try {
    assertStreamCompatible(stream, cameraRequest, isInitiatingIntent);
  } catch (error) {
    // A failed hard constraint on the initiating acquisition must not leave an
    // unleased, unusable stream cached for the next request.
    if (isInitiatingIntent && activeStream === stream && activeLeaseCount === 0) {
      activeStream = null;
      activeCameraRequest = null;
      stream.getTracks().forEach((track) => track.stop());
    }
    throw error;
  }
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
  const requestSnapshot = Object.freeze({ ...cameraRequest });
  const { stream, generation } = await acquireSharedStream(requestSnapshot);
  if (generation !== requestGeneration || activeStream !== stream) {
    throw new DOMException('Camera request was superseded.', 'AbortError');
  }

  activeLeaseCount += 1;
  let released = false;
  return {
    stream,
    prepareForScanning: async () => {
      if (released || generation !== requestGeneration || activeStream !== stream) return [];
      const tracks = stream.getVideoTracks().filter((track) => track.readyState === 'live');
      return Promise.all(tracks.map((track) => {
        const existing = focusPreparationByTrack.get(track);
        if (existing) return existing;
        const pending = requestContinuousAutofocus(track);
        focusPreparationByTrack.set(track, pending);
        return pending;
      }));
    },
    reapplyContinuousAutofocus: async () => {
      if (released || generation !== requestGeneration || activeStream !== stream) return [];
      const tracks = stream.getVideoTracks().filter((track) => track.readyState === 'live');
      return Promise.all(tracks.map((track) => {
        const existing = focusRecoveryByTrack.get(track);
        if (existing) return existing;
        const pending = requestContinuousAutofocus(track).finally(() => {
          if (focusRecoveryByTrack.get(track) === pending) focusRecoveryByTrack.delete(track);
        });
        focusRecoveryByTrack.set(track, pending);
        return pending;
      }));
    },
    release: () => {
      if (released) return;
      released = true;
      if (generation !== requestGeneration || activeStream !== stream) return;
      activeLeaseCount = Math.max(0, activeLeaseCount - 1);
      if (activeLeaseCount > 0) return;
      activeStream = null;
      activeCameraRequest = null;
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
  pendingCameraRequest = null;
  activeLeaseCount = 0;
  const stream = activeStream;
  activeStream = null;
  activeCameraRequest = null;
  stream?.getTracks().forEach((track) => track.stop());
}

export function hasActiveCameraStream(): boolean {
  return Boolean(activeStream?.getTracks().some((track) => track.readyState === 'live'));
}
