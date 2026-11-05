let activeStream: MediaStream | null = null;
let pendingRequest: Promise<MediaStream> | null = null;

/**
 * Shared camera access for feature modules.
 * Browser-granted origin permission is reused by getUserMedia; the stream is
 * shared while active and released when the feature closes or the app logs out.
 */
export async function acquireCameraStream(): Promise<MediaStream> {
  if (activeStream?.getTracks().some((track) => track.readyState === 'live')) return activeStream;
  if (pendingRequest) return pendingRequest;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
  }

  pendingRequest = navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }).then((stream) => {
    activeStream = stream;
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (activeStream === stream) activeStream = null;
      }, { once: true });
    });
    return stream;
  }).finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}

export function releaseCameraStream(): void {
  const stream = activeStream;
  activeStream = null;
  stream?.getTracks().forEach((track) => track.stop());
}

export function hasActiveCameraStream(): boolean {
  return Boolean(activeStream?.getTracks().some((track) => track.readyState === 'live'));
}
