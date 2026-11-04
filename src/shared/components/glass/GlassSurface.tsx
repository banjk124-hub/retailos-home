import { createElement } from 'react';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import type { GlassMaterial, GlassTone } from './GlassMaterial';

type Props<T extends ElementType> = {
  as?: T;
  material: GlassMaterial;
  tone?: GlassTone;
  interactive?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

export function GlassSurface<T extends ElementType = 'div'>({
  as,
  material,
  tone = 'neutral',
  interactive = false,
  className = '',
  ...props
}: Props<T>) {
  const Component = as ?? 'div';

  return createElement(Component, {
    ...props,
    className: `glass-surface glass-surface--${material}${className ? ` ${className}` : ''}`,
    'data-glass-tone': tone,
    'data-glass-interactive': interactive ? 'true' : undefined,
  });
}
