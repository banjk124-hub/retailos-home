let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;
let requestGeneration = 0;
const trackEndedListeners = new Set<(stream: MediaStream) => void>();

/**
 * Shared camera stream lifecycle.
 *
 * getUserMedia cannot be cancelled once requested. A generation token ensures
 * that a stream resolving after pause/close is stopped instead of being
 * accidentally attached to a later scanner session.
 */
export async function acquireCameraStream(): Promise<MediaStream> {
  if (activeStream?.getTracks().some((track) => track.readyState === 'live')) return activeStream;
  if (pendingRequest) return pendingRequest;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
  }

  const generation = requestGeneration;
  const request = navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }).then((stream) => {
    if (generation !== requestGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException('Camera request was superseded.', 'AbortError');
    }

    activeStream = stream;
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (activeStream !== stream) return;

        // A stream may expose more than one video track. Notify consumers only
        // when the stream no longer has a live video source.
        const hasLiveVideoTrack = stream.getVideoTracks()
          .some((videoTrack) => videoTrack.readyState === 'live');
        if (hasLiveVideoTrack) return;

        activeStream = null;
        trackEndedListeners.forEach((listener) => listener(stream));
      }, { once: true });
    });
    return stream;
  }).finally(() => {
    if (pendingRequest === request) pendingRequest = null;
  });

  pendingRequest = request;
  return request;
}

/**
 * Subscribe to unexpected termination of the currently owned video stream.
 * Intentional release does not emit this event because stopping a track does
 * not dispatch the browser's "ended" event.
 */
export function subscribeCameraTrackEnded(
  listener: (stream: MediaStream) => void,
): () => void {
  trackEndedListeners.add(listener);
  return () => {
    trackEndedListeners.delete(listener);
  };
}

/**
 * Invalidate pending camera work and release the active stream.
 * When an expected stream is supplied, release only that exact stream. This
 * prevents a stale scanner startup from stopping a newer scanner's camera.
 */
export function releaseCameraStream(expectedStream?: MediaStream): void {
  if (expectedStream && activeStream !== expectedStream) return;

  requestGeneration += 1;
  // Detach an unresolved request so a newly opened scanner can start a fresh one.
  // The old request still self-cancels when getUserMedia eventually resolves.
  pendingRequest = null;
  const stream = activeStream;
  activeStream = null;
  stream?.getTracks().forEach((track) => track.stop());
}

export function hasActiveCameraStream(): boolean {
  return Boolean(activeStream?.getTracks().some((track) => track.readyState === 'live'));
}
