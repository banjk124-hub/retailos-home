import type { ComponentPropsWithoutRef } from 'react';
import { MOTION_PRESETS } from './motion.presets';
import type { MotionPhase } from './motion.tokens';

type Props = ComponentPropsWithoutRef<'div'> & {
  active?: boolean;
  phase?: MotionPhase;
};

export function MotionPage({
  active = true,
  phase = 'activate',
  className = '',
  ...props
}: Props) {
  return (
    <div
      {...props}
      className={`motion-page${className ? ` ${className}` : ''}`}
      data-motion-preset={MOTION_PRESETS.page}
      data-motion-active={active ? 'true' : 'false'}
      data-motion-phase={phase}
    />
  );
}
