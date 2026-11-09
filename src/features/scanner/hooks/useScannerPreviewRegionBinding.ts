import { useEffect, useRef, type RefObject } from 'react';
import type { ScannerSourceScanRegion } from '../../../platform/scanner/contracts';
import { measureScannerPreviewRegion } from '../services/scannerPreviewRegion';

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  reticleRef: RefObject<HTMLElement | null>;
  videoSurfaceKey: number;
  enabled: boolean;
  onRegionChange: (region: ScannerSourceScanRegion | null) => void;
};

function regionSignature(region: ScannerSourceScanRegion | null): string {
  if (!region) return 'none';
  const { x, y, width, height } = region.rect;
  return [x, y, width, height].map((value) => value.toFixed(7)).join(':');
}

/**
 * Feature-level DOM adapter. Home and Stocktake supply their own video/reticle
 * refs; this hook only measures them and publishes source geometry. It never
 * starts, stops or recreates the scanner session.
 */
export function useScannerPreviewRegionBinding({
  videoRef,
  reticleRef,
  videoSurfaceKey,
  enabled,
  onRegionChange,
}: Options): void {
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;

  useEffect(() => {
    let frameHandle: number | null = null;
    let lastSignature: string | undefined;
    let resizeObserver: ResizeObserver | null = null;

    const publish = (region: ScannerSourceScanRegion | null) => {
      const signature = regionSignature(region);
      if (signature === lastSignature) return;
      lastSignature = signature;
      onRegionChangeRef.current(region);
    };

    const measure = () => {
      frameHandle = null;
      if (!enabled) {
        publish(null);
        return;
      }

      const video = videoRef.current;
      const reticle = reticleRef.current;
      if (!video || !reticle || video.videoWidth <= 0 || video.videoHeight <= 0) {
        publish(null);
        return;
      }

      const style = window.getComputedStyle(video);
      const region = measureScannerPreviewRegion({
        videoRect: video.getBoundingClientRect(),
        reticleRect: reticle.getBoundingClientRect(),
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight,
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        transform: style.transform,
      });
      publish(region);
    };

    const scheduleMeasure = () => {
      if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      frameHandle = window.requestAnimationFrame(measure);
    };

    if (!enabled) {
      publish(null);
      return () => {
        if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      };
    }

    const video = videoRef.current;
    const reticle = reticleRef.current;
    if (!video || !reticle) {
      publish(null);
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(video);
      resizeObserver.observe(reticle);
      if (video.parentElement) resizeObserver.observe(video.parentElement);
    }

    video.addEventListener('loadedmetadata', scheduleMeasure);
    video.addEventListener('loadeddata', scheduleMeasure);
    video.addEventListener('resize', scheduleMeasure);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);
    window.visualViewport?.addEventListener('scroll', scheduleMeasure);

    // Measure after refs and the module-owned reticle have committed. This is
    // not a camera-startup gate; invalid geometry simply publishes null.
    measure();

    return () => {
      if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      resizeObserver?.disconnect();
      video.removeEventListener('loadedmetadata', scheduleMeasure);
      video.removeEventListener('loadeddata', scheduleMeasure);
      video.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('scroll', scheduleMeasure);
    };
  }, [enabled, videoSurfaceKey, videoRef, reticleRef]);
}
