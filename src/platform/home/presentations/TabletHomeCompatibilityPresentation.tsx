import type { ReactNode } from 'react';
import './TabletHomeCompatibilityPresentation.css';

/**
 * Temporary compatibility surface. Tablet remains review-required and does not
 * inherit Mobile-only scanner capability or either approved platform layout.
 */
export function TabletHomeCompatibilityPresentation({ children }: { children: ReactNode }) {
  return <div className="home-presentation-root home-presentation-root--tablet" data-retailos-platform="tablet">{children}</div>;
}
