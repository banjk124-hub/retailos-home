import { memo } from 'react';
import type { RetailPlatform } from '../platform/platformCapabilities';
import type { LiquidDockProps } from './LiquidDock.types';
import { DesktopShellNavigation } from './DesktopShellNavigation';
import { MobileShellNavigation } from './MobileShellNavigation';
import { TabletShellNavigation } from './TabletShellNavigation';

export type ShellNavigationProps = LiquidDockProps & { platform: RetailPlatform };

/** Explicit platform composition; capability policy is resolved separately. */
export const ShellNavigation = memo(function ShellNavigation({ platform, ...props }: ShellNavigationProps) {
  if (platform === 'desktop') return <DesktopShellNavigation {...props} />;
  if (platform === 'mobile') return <MobileShellNavigation {...props} />;
  return <TabletShellNavigation {...props} />;
});
