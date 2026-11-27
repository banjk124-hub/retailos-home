import type { ReactNode } from 'react';
import './MobileHomePresentation.css';

export function MobileHomePresentation({ children }: { children: ReactNode }) {
  return <div className="home-presentation-root home-presentation-root--mobile" data-retailos-platform="mobile">{children}</div>;
}
