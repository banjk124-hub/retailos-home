export const MOTION_CONFIG = {
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
  interaction: {
    press: { duration: 'var(--motion-duration-fast)', easing: 'var(--motion-ease-standard)', distance: 'var(--motion-distance-micro)' },
    activate: { duration: 'var(--motion-duration-standard)', easing: 'var(--motion-ease-enter)', distance: 'var(--motion-distance-short)' },
    travel: { duration: 'var(--motion-duration-transition)', easing: 'var(--motion-ease-spatial)', distance: 'var(--motion-distance-medium)' },
    reveal: { duration: 'var(--motion-duration-emphasized)', easing: 'var(--motion-ease-enter)', distance: 'var(--motion-distance-short)' },
    hold: { duration: 'var(--motion-duration-standard)', easing: 'var(--motion-ease-standard)', distance: 'var(--motion-distance-micro)' },
    settle: { duration: 'var(--motion-duration-fast)', easing: 'var(--motion-ease-standard)', distance: 'var(--motion-distance-micro)' },
    exit: { duration: 'var(--motion-duration-standard)', easing: 'var(--motion-ease-exit)', distance: 'var(--motion-distance-short)' },
  },
  journey: {
    identityHoldMs: 1350,
    homeArrivalMs: 1100,
  },
  animations: {
    sheetExit: 'motion-sheet-exit',
  },
} as const;
