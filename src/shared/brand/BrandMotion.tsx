import type { ReactNode } from 'react';
import { MotionPresence } from '../motion';
import type { MotionPhase, MotionState } from '../motion';

type Props = {
  children: ReactNode;
  className?: string;
  state?: MotionState;
  phase?: MotionPhase;
};

export function BrandMotion({ children, className = '', state = 'idle', phase = 'reveal' }: Props) {
  return (
    <MotionPresence
      preset="presence"
      motionState={state}
      phase={phase}
      className={`retailos-brand-motion${className ? ` ${className}` : ''}`}
    >
      {children}
    </MotionPresence>
  );
}
