import { useEffect, useRef, type RefObject } from 'react';
import type { ScannerSourceScanRegion } from '../../../platform/scanner/contracts';
import {
  createScannerGeometrySignature,
  ScannerGeometryRevisionTracker,
} from '../../../platform/scanner/scannerGeometry';
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
 * Feature-level DOM adapter. Each measurement is tied to a monotonically
 * increasing geometry version. When any input changes, the previous ROI is
 * cleared synchronously; a fresh ROI is published only after measurement.
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
    let lastRegionSignature: string | undefined;
    let lastGeometrySignature: string | null = null;
    let invalidated = false;
    const revision = new ScannerGeometryRevisionTracker();
    let resizeObserver: ResizeObserver | null = null;

    const publish = (region: ScannerSourceScanRegion | null) => {
      const signature = regionSignature(region);
      if (signature === lastRegionSignature) return;
      lastRegionSignature = signature;
      onRegionChangeRef.current(region);
    };

    const readGeometrySignature = (video: HTMLVideoElement, reticle: HTMLElement): string | null => {
      const style = window.getComputedStyle(video);
      const viewport = window.visualViewport;
      return createScannerGeometrySignature({
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight,
        videoRect: video.getBoundingClientRect(),
        reticleRect: reticle.getBoundingClientRect(),
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        transform: style.transform,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        visualViewportOffsetLeft: viewport?.offsetLeft ?? 0,
        visualViewportOffsetTop: viewport?.offsetTop ?? 0,
        visualViewportScale: viewport?.scale ?? 1,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
    };

    const invalidate = () => {
      invalidated = true;
      revision.invalidate();
      lastGeometrySignature = null;
      // Clear stale source ROI before the next layout read or animation frame.
      publish(null);
    };

    const measure = () => {
      frameHandle = null;
      if (!enabled) {
        invalidate();
        return;
      }

      const video = videoRef.current;
      const reticle = reticleRef.current;
      if (!video || !reticle || video.videoWidth <= 0 || video.videoHeight <= 0) {
        invalidate();
        return;
      }

      const geometrySignature = readGeometrySignature(video, reticle);
      const geometryRevision = revision.update(geometrySignature);
      if (!geometrySignature || !geometryRevision) {
        invalidated = true;
        publish(null);
        return;
      }

      if (geometrySignature !== lastGeometrySignature) {
        // The first valid measurement also establishes a new version after
        // invalidation; any region from the previous layout is discarded.
        lastGeometrySignature = geometrySignature;
        invalidated = true;
        publish(null);
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
      if (!region) {
        invalidated = true;
        publish(null);
        return;
      }

      const nextRegion = { ...region, geometryVersion: geometryRevision.version };
      invalidated = false;
      publish(nextRegion);
    };

    const scheduleMeasure = () => {
      const video = videoRef.current;
      const reticle = reticleRef.current;
      const currentSignature = video && reticle ? readGeometrySignature(video, reticle) : null;
      if (!currentSignature || currentSignature !== lastGeometrySignature) {
        invalidate();
      }
      if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
      frameHandle = window.requestAnimationFrame(measure);
    };

    if (!enabled) {
      invalidate();
      return () => {
        if (frameHandle !== null) window.cancelAnimationFrame(frameHandle);
        revision.invalidate();
      };
    }

    const video = videoRef.current;
    const reticle = reticleRef.current;
    if (!video || !reticle) {
      invalidate();
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
    window.matchMedia?.('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)')
      .addEventListener?.('change', scheduleMeasure);

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
      revision.invalidate();
      publish(null);
    };
  }, [enabled, videoSurfaceKey, videoRef, reticleRef]);
}
