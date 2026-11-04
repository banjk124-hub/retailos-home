export const MOTION_PRESETS = {
  presence: 'presence',
  page: 'page',
  card: 'card',
  dock: 'dock',
  sheet: 'sheet',
  press: 'press',
  activate: 'activate',
  expand: 'expand',
  collapse: 'collapse',
  reveal: 'reveal',
  sharedElement: 'sharedElement',
  directionalForward: 'directionalForward',
  directionalBackward: 'directionalBackward',
  dockSelection: 'dockSelection',
  sheetPresentation: 'sheetPresentation',
  identityTransition: 'identityTransition',
  homeArrival: 'homeArrival',
  settle: 'settle',
} as const;

export type MotionPreset = (typeof MOTION_PRESETS)[keyof typeof MOTION_PRESETS];
