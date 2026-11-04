import type { CSSProperties } from 'react';

type Props = {
  slot: number;
  slotCount: number;
  direction: 'none' | 'left' | 'right';
  moving: boolean;
};

export function LiquidDockIndicator({ slot, slotCount, direction, moving }: Props) {
  const style = {
    '--dock-slot': slot,
    '--dock-slot-count': slotCount,
  } as CSSProperties & { '--dock-slot': number; '--dock-slot-count': number };

  return (
    <span
      className="liquid-dock__indicator"
      data-direction={direction}
      data-moving={moving ? 'true' : 'false'}
      style={style}
      aria-hidden="true"
    >
      <span className="liquid-dock__indicator-surface" />
    </span>
  );
}
