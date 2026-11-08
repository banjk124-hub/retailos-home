import { useLayoutEffect, useState, type CSSProperties } from 'react';

type ScannerViewportStyle = CSSProperties & {
  '--scanner-visual-viewport-height': string;
  '--scanner-visual-viewport-top': string;
};

/** Track iOS Safari's visual viewport instead of assuming the layout viewport equals the visible screen. */
export function useScannerViewportStyle(): ScannerViewportStyle {
  const [viewport, setViewport] = useState({ height: 0, top: 0 });
  useLayoutEffect(() => {
    const visualViewport = window.visualViewport;
    const sync = () => {
      setViewport({
        height: Math.max(1, Math.round(visualViewport?.height ?? window.innerHeight)),
        top: Math.max(0, Math.round(visualViewport?.offsetTop ?? 0)),
      });
    };
    sync();
    visualViewport?.addEventListener('resize', sync);
    visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      visualViewport?.removeEventListener('resize', sync);
      visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
  return {
    '--scanner-visual-viewport-height': viewport.height ? `${viewport.height}px` : '100dvh',
    '--scanner-visual-viewport-top': `${viewport.top}px`,
  };
}
