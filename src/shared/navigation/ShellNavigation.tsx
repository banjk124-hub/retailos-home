import { memo } from 'react';
import type { LiquidDockProps } from './LiquidDock.types';
import { DesktopShellNavigation } from './DesktopShellNavigation';
import { MobileShellNavigation } from './MobileShellNavigation';

/**
 * Shared navigation contract with independently owned Desktop and Mobile renderers.
 * CSS selects the presentation surface only; it never gates feature capability.
 */
export const ShellNavigation = memo(function ShellNavigation(props: LiquidDockProps) {
  return (
    <div className="shell-navigation">
      <DesktopShellNavigation {...props} />
      <MobileShellNavigation {...props} />
    </div>
  );
});
