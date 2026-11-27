import type { ReactNode } from 'react';
import type { RetailPlatform } from '../../shared/platform/platformCapabilities';
import { DesktopHomePresentation } from './presentations/DesktopHomePresentation';
import { MobileHomePresentation } from './presentations/MobileHomePresentation';
import { TabletHomeCompatibilityPresentation } from './presentations/TabletHomeCompatibilityPresentation';

export function HomePresentationRoot({ platform, children }: { platform: RetailPlatform; children: ReactNode }) {
  if (platform === 'desktop') return <DesktopHomePresentation>{children}</DesktopHomePresentation>;
  if (platform === 'mobile') return <MobileHomePresentation>{children}</MobileHomePresentation>;
  return <TabletHomeCompatibilityPresentation>{children}</TabletHomeCompatibilityPresentation>;
}
