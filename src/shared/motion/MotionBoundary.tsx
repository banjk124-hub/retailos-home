import type { ReactNode } from 'react';
import { useMotionState } from './MotionProvider';

type Props = {
  children: ReactNode;
};

export function MotionBoundary({ children }: Props) {
  const { prefersReducedMotion } = useMotionState();

  return (
    <div
      className="motion-boundary"
      data-motion-preference={prefersReducedMotion ? 'reduced' : 'full'}
    >
      {children}
    </div>
  );
}
