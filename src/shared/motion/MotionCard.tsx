import type { ReactNode } from 'react';
import { MotionPresence } from './MotionPresence';
import { MOTION_PRESETS } from './motion.presets';

type Props = {
  children: ReactNode;
  className?: string;
};

export function MotionCard({ children, className = '' }: Props) {
  return (
    <MotionPresence as="div" preset={MOTION_PRESETS.card} className={`motion-card${className ? ` ${className}` : ''}`}>
      {children}
    </MotionPresence>
  );
}
