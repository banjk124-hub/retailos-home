import { BRAND_CONFIG } from './brand.config';
import type { BrandVariant } from './brand.types';

type Props = {
  variant: Exclude<BrandVariant, 'symbol'>;
  subtitle?: string;
};

export function BrandWordmark({ variant, subtitle = BRAND_CONFIG.caption }: Props) {
  const showCaption = variant === 'full' || variant === 'splash';

  return (
    <span className="brand-copy">
      <span className="brand-name">
        {BRAND_CONFIG.wordmark}<span>{BRAND_CONFIG.wordmarkAccent}</span>
      </span>
      {showCaption && subtitle && <span className="brand-caption">{subtitle}</span>}
    </span>
  );
}
