import type { MotionState } from '../motion';
import { Icon as IconGlyph } from '../icons/Icon';
import type { IconSize, RetailIcon } from '../icons/icon.types';

export type MotionIconVariant =
  | 'department'
  | 'home'
  | 'navigation'
  | 'scanner'
  | 'bell'
  | 'search'
  | 'module'
  | 'secure'
  | 'arrow';

type Props = {
  icon: RetailIcon;
  variant: MotionIconVariant;
  active?: boolean;
  state?: MotionState;
  size?: IconSize | number;
  strokeWidth?: number;
  label?: string;
};

export function MotionIcon({
  icon: Icon,
  variant,
  active = false,
  state,
  size,
  strokeWidth,
  label,
}: Props) {
  const motionState = state ?? (active ? 'active' : 'idle');

  return (
    <span
      className={`ro-icon-motion ro-icon-motion--${variant}${active ? ' is-active' : ''}`}
      data-motion-state={motionState}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <IconGlyph icon={Icon} size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
