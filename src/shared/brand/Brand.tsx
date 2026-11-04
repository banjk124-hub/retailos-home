import { BrandMark } from './BrandMark';
import { BrandWordmark } from './BrandWordmark';
import { BRAND_CONFIG } from './brand.config';
import type { BrandLayout, BrandSurface, BrandVariant } from './brand.types';

type Props = {
  variant?: BrandVariant;
  surface?: BrandSurface;
  layout?: BrandLayout;
  className?: string;
  subtitle?: string;
  label?: string;
};

export function Brand({
  variant = 'full',
  surface = 'light',
  layout = 'horizontal',
  className = '',
  subtitle,
  label = BRAND_CONFIG.name,
}: Props) {
  const classNames = [
    'brand-lockup',
    `retailos-brand--${variant}`,
    `retailos-brand--surface-${surface}`,
    `retailos-brand--${layout}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} role="img" aria-label={label}>
      <span className="brand-mark"><BrandMark /></span>
      {variant !== 'symbol' && <BrandWordmark variant={variant} subtitle={subtitle} />}
    </span>
  );
}
