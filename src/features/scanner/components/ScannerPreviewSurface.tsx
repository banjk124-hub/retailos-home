import type { RefObject } from 'react';

type Props = {
  videoRef: RefObject<HTMLVideoElement>;
  videoSurfaceKey: number;
  isPreviewReady: boolean;
  ariaLabel: string;
};

/**
 * Shared engine-owned camera presentation.
 * The native video stays opaque; a sibling curtain is removed only after the
 * engine confirms a fresh, usable frame. Features provide layout, not timing.
 */
export default function ScannerPreviewSurface({
  videoRef,
  videoSurfaceKey,
  isPreviewReady,
  ariaLabel,
}: Props) {
  return (
    <>
      <video
        key={videoSurfaceKey}
        ref={videoRef}
        className="scanner-engine-preview-video"
        muted
        playsInline
        autoPlay
        aria-label={ariaLabel}
      />
      <div
        className={`scanner-engine-preview-curtain${isPreviewReady ? ' is-revealed' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}
