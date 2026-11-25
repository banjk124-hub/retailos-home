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
