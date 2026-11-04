import type { IconSize, RetailIcon } from './icon.types';
import { ICON_SIZES, ICON_STROKE_WIDTH } from './icon.presets';

type Props = {
  icon: RetailIcon;
  size?: IconSize | number;
  strokeWidth?: number;
  label?: string;
  className?: string;
};

export function Icon({
  icon: IconComponent,
  size = 'md',
  strokeWidth = ICON_STROKE_WIDTH,
  label,
  className,
}: Props) {
  const resolvedSize = typeof size === 'number' ? size : ICON_SIZES[size];

  return (
    <IconComponent
      size={resolvedSize}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
