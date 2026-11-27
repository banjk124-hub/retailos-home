import type { ReactNode } from 'react';
import './DesktopHomePresentation.css';

export function DesktopHomePresentation({ children }: { children: ReactNode }) {
  return <div className="home-presentation-root home-presentation-root--desktop" data-retailos-platform="desktop">{children}</div>;
}
