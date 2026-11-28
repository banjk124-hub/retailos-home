import { memo, useCallback, useRef, useState } from 'react';
import { LibraryBig } from 'lucide-react';
import { MotionIcon } from '../icons';
import { Surface } from '../components/surface/Surface';
import type { LiquidDockProps } from './LiquidDock.types';
import { DesktopShellModuleLibrary } from '../../platform/shell/DesktopShellModuleLibrary';
import './DesktopShellNavigation.css';

/** Desktop-owned navigation rendering over the shared destination contract. */
export const DesktopShellNavigation = memo(function DesktopShellNavigation({
  items, activeId, onSelect, action, label = 'Điều hướng chính',
}: LiquidDockProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const closeLibrary = useCallback(() => {
    setLibraryOpen(false);
    requestAnimationFrame(() => libraryButtonRef.current?.focus());
  }, []);

  return (
    <>
      <Surface as="nav" variant="floating" className="desktop-shell-navigation" aria-label={label}>
        <div className="desktop-shell-navigation__items">
          {items.map((item) => {
            const active = item.id === activeId && !item.disabled;
            return (
              <button key={item.id} type="button"
                className={`desktop-shell-navigation__item${active ? ' is-active' : ''}`}
                aria-label={item.label} aria-current={active ? 'location' : undefined}
                aria-disabled={item.disabled || undefined} disabled={item.disabled}
                title={item.label} onClick={() => onSelect(item.id)}>
                <span className="desktop-shell-navigation__icon">
                  <MotionIcon icon={item.icon} variant={item.id === 'home' ? 'home' : 'navigation'} active={active} state={item.disabled ? 'disabled' : active ? 'active' : 'idle'} size={21} />
                </span>
                <span className="desktop-shell-navigation__label">{item.label}</span>
                {Boolean(item.noticeCount) && <span className="desktop-shell-navigation__badge" aria-label={`${item.noticeCount} thông báo đang chờ`}>{item.noticeCount}</span>}
              </button>
            );
          })}
        </div>
        <div className="desktop-shell-navigation__library-utility">
          <button ref={libraryButtonRef} type="button" className={`desktop-shell-navigation__library${libraryOpen ? ' is-open' : ''}`}
            aria-label="Mở thư viện nghiệp vụ" aria-expanded={libraryOpen} aria-haspopup="dialog" title="Thư viện nghiệp vụ"
            onClick={() => setLibraryOpen((open) => !open)}>
            <LibraryBig size={20} />
            <span>Thư viện</span>
          </button>
        </div>
        {action && <div className="desktop-shell-navigation__utility">
          <button type="button" className="desktop-shell-navigation__action"
            aria-label={action.label} title={action.label} disabled={action.disabled}
            onClick={(event) => action.onSelect(event)}>
            <MotionIcon icon={action.icon} variant="navigation" state={action.disabled ? 'disabled' : 'idle'} size={21} />
            <span>{action.label}</span>
          </button>
        </div>}
      </Surface>
      {libraryOpen && <DesktopShellModuleLibrary triggerRef={libraryButtonRef} onClose={closeLibrary} />}
    </>
  );
});
