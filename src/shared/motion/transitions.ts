import { MOTION_CONFIG } from './motion.config';
import type { MotionOrigin } from './MotionSheet';
import type { MotionPhase } from './motion.tokens';

export function getMotionOrigin(element: HTMLElement): MotionOrigin {
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

export function resolveMotionPhase(phase: MotionPhase = 'idle') {
  return MOTION_CONFIG.interaction[phase === 'idle' ? 'activate' : phase] ?? MOTION_CONFIG.interaction.activate;
}

export function attachMotionPhaseVariables(element: HTMLElement, phase: MotionPhase = 'idle') {
  const resolved = resolveMotionPhase(phase);
  element.style.setProperty('--motion-phase-duration', resolved.duration);
  element.style.setProperty('--motion-phase-easing', resolved.easing);
  element.style.setProperty('--motion-phase-distance', resolved.distance);
  return element;
}
