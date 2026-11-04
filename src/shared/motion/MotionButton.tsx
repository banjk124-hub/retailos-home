import type { ComponentPropsWithoutRef } from 'react';
import { GlassSurface } from '../components/glass/GlassSurface';
import type { GlassMaterial, GlassTone } from '../components/glass/GlassMaterial';
import type { MotionPhase, MotionState } from './motion.tokens';

type Props = ComponentPropsWithoutRef<'button'> & {
  material: GlassMaterial;
  tone?: GlassTone;
  motionState?: MotionState;
  motionPhase?: MotionPhase;
};

export function MotionButton({
  material,
  tone = 'neutral',
  motionState = 'idle',
  motionPhase = 'press',
  className = '',
  ...props
}: Props) {
  return (
    <GlassSurface
      as="button"
      material={material}
      tone={tone}
      interactive
      className={`motion-button${className ? ` ${className}` : ''}`}
      data-motion-state={motionState}
      data-motion-phase={motionPhase}
      {...props}
    />
  );
}
