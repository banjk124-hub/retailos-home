import type { ComponentPropsWithoutRef } from 'react';
import { Surface } from '../components/surface/Surface';

import type { MotionPhase, MotionState } from './motion.tokens';

type Props = ComponentPropsWithoutRef<'button'> & {
  variant: 'control' | 'brand';
  
  motionState?: MotionState;
  motionPhase?: MotionPhase;
};

export function MotionButton({
  variant,
  motionState = 'idle',
  motionPhase = 'press',
  className = '',
  ...props
}: Props) {
  return (
    <Surface
      as="button"
      variant={variant}
      interactive
      className={`motion-button${className ? ` ${className}` : ''}`}
      data-motion-state={motionState}
      data-motion-phase={motionPhase}
      {...props}
    />
  );
}
