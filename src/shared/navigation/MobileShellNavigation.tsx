import { memo } from 'react';
import { LiquidDock } from './LiquidDock';
import type { LiquidDockProps } from './LiquidDock.types';
import './MobileShellNavigation.css';

/** Mobile-owned dock rendering over the shared destination contract. */
export const MobileShellNavigation = memo(function MobileShellNavigation(props: LiquidDockProps) {
  return <div className="mobile-shell-navigation"><LiquidDock {...props} /></div>;
});
