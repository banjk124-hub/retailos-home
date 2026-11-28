import type { ReactNode } from 'react';
import type { RetailPlatform } from '../../shared/platform/platformCapabilities';
import './AuthenticatedShellPresentationRoot.css';

/** Platform-level frame for the persistent authenticated Shell, independent of any Page. */
export function AuthenticatedShellPresentationRoot({ platform, children }: { platform: RetailPlatform; children: ReactNode }) {
  return <div className={`authenticated-shell-root authenticated-shell-root--${platform}`} data-retailos-shell-platform={platform}>{children}</div>;
}
