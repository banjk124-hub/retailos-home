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
      const nextViewport = {
        height: Math.max(1, Math.round(visualViewport?.height ?? window.innerHeight)),
        top: Math.max(0, Math.round(visualViewport?.offsetTop ?? 0)),
      };
      setViewport((current) => (
        current.height === nextViewport.height && current.top === nextViewport.top
          ? current
          : nextViewport
      ));
    };
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'hidden') sync();
    };
    sync();
    visualViewport?.addEventListener('resize', sync);
    visualViewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('pageshow', syncWhenVisible);
    document.addEventListener('visibilitychange', syncWhenVisible);
    return () => {
      visualViewport?.removeEventListener('resize', sync);
      visualViewport?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('pageshow', syncWhenVisible);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, []);
  return {
    '--scanner-visual-viewport-height': viewport.height ? `${viewport.height}px` : '100dvh',
    '--scanner-visual-viewport-top': `${viewport.top}px`,
  };
}
