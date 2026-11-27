import { useSyncExternalStore } from 'react';
import type { RetailPlatform } from './platformCapabilities';

export type RetailPlatformSignals = Readonly<{
  primaryFinePointer: boolean;
  primaryHover: boolean;
  primaryCoarsePointer: boolean;
  touchPoints: number;
  screenWidth: number;
  screenHeight: number;
}>;

/**
 * Resolves the active interaction context, not feature capability.
 * Coarse touch on a tablet-sized physical screen stays Tablet (review-required).
 * Breakpoints are deliberately not used to infer product platform.
 */
export function resolveRetailPlatform(signals: RetailPlatformSignals): RetailPlatform {
  const shortScreenEdge = Math.min(signals.screenWidth, signals.screenHeight);
  const hasTabletSizedTouchSurface = signals.touchPoints > 0 && shortScreenEdge >= 600;
  if (hasTabletSizedTouchSurface) return 'tablet';

  if (signals.primaryFinePointer && signals.primaryHover) return 'desktop';

  const hasTouchInput = signals.primaryCoarsePointer || signals.touchPoints > 0;
  if (hasTouchInput) {
    return shortScreenEdge >= 600 ? 'tablet' : 'mobile';
  }

  // Unknown/ambiguous input environments use the conservative compatibility context.
  return 'tablet';
}

function readPlatform(): RetailPlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'tablet';
  const query = (value: string) => window.matchMedia?.(value).matches ?? false;
  return resolveRetailPlatform({
    primaryFinePointer: query('(pointer: fine)'),
    primaryHover: query('(hover: hover)'),
    primaryCoarsePointer: query('(pointer: coarse)'),
    touchPoints: navigator.maxTouchPoints ?? 0,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
  });
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const media = ['(pointer: fine)', '(hover: hover)', '(pointer: coarse)']
    .map((query) => window.matchMedia?.(query))
    .filter((item): item is MediaQueryList => Boolean(item));
  const notify = () => onChange();
  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', notify);
  media.forEach((item) => item.addEventListener('change', notify));
  return () => {
    window.removeEventListener('resize', notify);
    window.removeEventListener('orientationchange', notify);
    media.forEach((item) => item.removeEventListener('change', notify));
  };
}

/** Reactive interaction-context snapshot shared by authenticated presentation roots. */
export function useRetailPlatform(): RetailPlatform {
  return useSyncExternalStore(subscribe, readPlatform, () => 'tablet');
}
