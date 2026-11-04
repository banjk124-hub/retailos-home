export const MOTION_TOKENS = {
  duration: {
    instant: 'var(--motion-duration-instant)',
    fast: 'var(--motion-duration-fast)',
    standard: 'var(--motion-duration-standard)',
    emphasized: 'var(--motion-duration-emphasized)',
    transition: 'var(--motion-duration-transition)',
  },
  easing: {
    standard: 'var(--motion-ease-standard)',
    enter: 'var(--motion-ease-enter)',
    exit: 'var(--motion-ease-exit)',
    emphasized: 'var(--motion-ease-emphasized)',
    spatial: 'var(--motion-ease-spatial)',
  },
  spring: {
    gentle: 'var(--motion-spring-gentle)',
    standard: 'var(--motion-spring-standard)',
    responsive: 'var(--motion-spring-responsive)',
    expressive: 'var(--motion-spring-expressive)',
  },
  distance: {
    micro: 'var(--motion-distance-micro)',
    short: 'var(--motion-distance-short)',
    medium: 'var(--motion-distance-medium)',
    long: 'var(--motion-distance-long)',
  },
} as const;

export type MotionState =
  | 'idle'
  | 'hover'
  | 'pressed'
  | 'active'
  | 'loading'
  | 'success'
  | 'error'
  | 'disabled';

export type MotionPhase =
  | 'idle'
  | 'press'
  | 'activate'
  | 'travel'
  | 'reveal'
  | 'hold'
  | 'settle'
  | 'exit';
