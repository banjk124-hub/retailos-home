let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;
let requestGeneration = 0;
const trackEndedListeners = new Set<(stream: MediaStream) => void>();

/**
 * Best-effort continuous autofocus. Camera capabilities differ across iOS,
 * Android and browser versions, so unsupported constraints must never block
 * camera startup.
 */
async function optimizeVideoTrack(track: MediaStreamTrack): Promise<void> {
  try {
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      focusMode?: string[];
    };
    if (capabilities.focusMode?.includes('continuous')) {
      await track.applyConstraints({
        advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
      });
    }
  } catch (error) {
    // iOS Safari and some Android camera providers reject optional focus modes.
    console.debug('[RetailOS Camera] Optional autofocus constraint unavailable:', error);
  }
}

/**
 * Shared camera stream lifecycle. A single stream is shared by scanner
 * consumers; stale getUserMedia resolutions are stopped using a generation.
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
      frameRate: { ideal: 30, max: 30 },
    },
  }).then(async (stream) => {
    if (generation !== requestGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException('Camera request was superseded.', 'AbortError');
    }

    activeStream = stream;
    const videoTracks = stream.getVideoTracks();
    await Promise.all(videoTracks.map(optimizeVideoTrack));
    videoTracks.forEach((track) => {
      track.addEventListener('ended', () => {
        if (activeStream !== stream) return;
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

export function subscribeCameraTrackEnded(listener: (stream: MediaStream) => void): () => void {
  trackEndedListeners.add(listener);
  return () => trackEndedListeners.delete(listener);
}

/**
 * Invalidate pending camera work and release the active stream. Supplying an
 * expected stream prevents an old session from stopping a newer camera lease.
 */
export function releaseCameraStream(expectedStream?: MediaStream): void {
  if (expectedStream) {
    if (activeStream !== expectedStream) return;
    activeStream = null;
    expectedStream.getTracks().forEach((track) => track.stop());
    return;
  }

  requestGeneration += 1;
  pendingRequest = null;
  const stream = activeStream;
  activeStream = null;
  stream?.getTracks().forEach((track) => track.stop());
}

export function hasActiveCameraStream(): boolean {
  return Boolean(activeStream?.getTracks().some((track) => track.readyState === 'live'));
}
