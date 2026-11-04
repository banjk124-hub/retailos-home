import { createElement } from 'react';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import type { MotionPreset } from './motion.presets';
import type { MotionPhase, MotionState } from './motion.tokens';

export type MotionPresenceProps<T extends ElementType> = {
  as?: T;
  preset: MotionPreset;
  motionState?: MotionState;
  phase?: MotionPhase;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function MotionPresence<T extends ElementType = 'div'>({
  as,
  preset,
  motionState = 'idle',
  phase = 'idle',
  className = '',
  children,
  ...props
}: MotionPresenceProps<T>) {
  const Component = as ?? 'div';

  return createElement(Component, {
    ...props,
    className: `motion-presence${className ? ` ${className}` : ''}`,
    'data-motion-preset': preset,
    'data-motion-state': motionState,
    'data-motion-phase': phase,
  }, children);
}
