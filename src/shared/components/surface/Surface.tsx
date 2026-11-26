import { createElement } from 'react';
import type { ComponentPropsWithoutRef, ElementType } from 'react';
import './surface.css';

export type SurfaceVariant = 'panel' | 'control' | 'raised' | 'floating' | 'inverse' | 'brand';

type Props<T extends ElementType> = {
  as?: T;
  variant?: SurfaceVariant;
  interactive?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

/** Semantic surface primitive. Visual treatment is based on role, not material effects. */
export function Surface<T extends ElementType = 'div'>({
  as,
  variant = 'panel',
  interactive = false,
  className = '',
  ...props
}: Props<T>) {
  const Component = as ?? 'div';
  return createElement(Component, {
    ...props,
    className: `surface surface--${variant}${interactive ? ' surface--interactive' : ''}${className ? ` ${className}` : ''}`,
  });
}
