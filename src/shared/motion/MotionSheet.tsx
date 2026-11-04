import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { MOTION_PRESETS } from './motion.presets';

export type MotionOrigin = {
  x: number;
  y: number;
};

type MotionStyle = CSSProperties & {
  '--motion-origin-x': string;
  '--motion-origin-y': string;
};

type Props = ComponentPropsWithoutRef<'section'> & {
  origin?: MotionOrigin;
  exiting?: boolean;
};

export function MotionSheet({
  origin,
  exiting = false,
  className = '',
  style,
  ...props
}: Props) {
  const motionStyle: MotionStyle = {
    ...style,
    '--motion-origin-x': origin ? `${origin.x}px` : '50vw',
    '--motion-origin-y': origin ? `${origin.y}px` : '50vh',
  };

  return (
    <section
      {...props}
      className={`motion-sheet${className ? ` ${className}` : ''}`}
      data-motion-preset={MOTION_PRESETS.sheet}
      data-motion-state={exiting ? 'exit' : 'enter'}
      style={motionStyle}
    />
  );
}
