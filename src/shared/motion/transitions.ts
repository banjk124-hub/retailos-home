import type { MotionOrigin } from './MotionSheet';

export function getMotionOrigin(element: HTMLElement): MotionOrigin {
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}
