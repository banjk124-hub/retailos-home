export const GLASS_MATERIALS = [
  'soft',
  'frosted',
  'elevated',
  'floating',
  'control',
  'dark',
] as const;

export type GlassMaterial = (typeof GLASS_MATERIALS)[number];
export type GlassTone = 'neutral' | 'brand';
