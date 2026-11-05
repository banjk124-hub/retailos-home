let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;
let requestGeneration = 0;

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
        if (activeStream === stream) activeStream = null;
      }, { once: true });
    });
    return stream;
  }).finally(() => {
    if (pendingRequest === request) pendingRequest = null;
  });

  pendingRequest = request;
  return request;
}

/** Invalidate pending getUserMedia work and release any active stream. */
export function releaseCameraStream(): void {
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
