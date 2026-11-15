import { memo, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { GlassSurface } from '../components/glass';
import { MotionIcon } from '../icons';
import { useMotionState } from '../motion';
import { LiquidDockIndicator } from './LiquidDockIndicator';
import { LiquidDockItem } from './LiquidDockItem';
import type { LiquidDockProps } from './LiquidDock.types';
import { useDockInteraction } from './useDockInteraction';

export const LiquidDock = memo(function LiquidDock({
  items,
  activeId,
  onSelect,
  action,
  label = 'Điều hướng chính',
  className = '',
  hidden = false,
}: LiquidDockProps) {
  const [isActionExpanded, setIsActionExpanded] = useState(false);
  const actionWrapRef = useRef<HTMLDivElement>(null);
  const { prefersReducedMotion } = useMotionState();

  useEffect(() => {
    if (!isActionExpanded) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionWrapRef.current?.contains(event.target)) setIsActionExpanded(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsActionExpanded(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isActionExpanded]);
  const activeIndex = items.findIndex((item) => item.id === activeId && !item.disabled);
  const slotCount = items.length + (action ? 1 : 0);
  const actionSlot = action ? Math.floor(slotCount / 2) : -1;
  const activeSlot = activeIndex < 0
    ? -1
    : activeIndex + (action && activeIndex >= actionSlot ? 1 : 0);
  const { direction, isMoving, isKeyboardOpen } = useDockInteraction(activeSlot);
  const unavailableForFocus = hidden || isKeyboardOpen;

  const focusRelativeItem = (event: KeyboardEvent<HTMLElement>) => {
    if (
      unavailableForFocus
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    ) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-dock-item]:not(:disabled)'),
    );
    if (!buttons.length) return;

    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  };

  return (
    <GlassSurface
      as="nav"
      material="floating"
      className={`liquid-dock${className ? ` ${className}` : ''}`}
      aria-label={label}
      aria-hidden={isKeyboardOpen || hidden || undefined}
      data-motion-preference={prefersReducedMotion ? 'reduced' : 'full'}
      data-keyboard-open={isKeyboardOpen ? 'true' : undefined}
      data-hidden={hidden ? 'true' : undefined}
      onKeyDown={focusRelativeItem}
    >
      <span
        className="liquid-dock__track"
        style={{ '--dock-slot-count': slotCount } as CSSProperties & { '--dock-slot-count': number }}
      >
        {activeSlot >= 0 && (
          <LiquidDockIndicator
            slot={activeSlot}
            slotCount={slotCount}
            direction={direction}
            moving={isMoving}
          />
        )}
        {Array.from({ length: slotCount }, (_, slot) => {
          if (action && slot === actionSlot) {
            return (
              <div key={`action-${action.label}`} className={`liquid-dock__action-wrap${isActionExpanded && action.choices?.length ? ' is-expanded' : ''}`} ref={actionWrapRef} data-dock-action>
                <button
                  type="button"
                  className="liquid-dock__action"
                  aria-label={isActionExpanded ? 'Thu gọn tra cứu' : action.label}
                  aria-expanded={Boolean(action.choices?.length && isActionExpanded)}
                  title={action.label}
                  data-dock-item
                  disabled={action.disabled}
                  tabIndex={unavailableForFocus ? -1 : undefined}
                  onClick={(event) => {
                    if (action.choices?.length) setIsActionExpanded((expanded) => !expanded);
                    else action.onSelect(event);
                  }}
                >
                  <span className="liquid-dock__action-icon"><MotionIcon icon={action.icon} variant="navigation" state={action.disabled ? 'disabled' : 'idle'} size={25} strokeWidth={2.1} /></span>
                  <span className="liquid-dock__label">{isActionExpanded ? 'Chọn thao tác' : action.label}</span>
                </button>
                {Boolean(action.choices?.length) && <span className="liquid-dock__action-choices" aria-hidden={!isActionExpanded}>
                  {action.choices?.map((choice) => <button key={choice.id} type="button" className="liquid-dock__choice" aria-label={choice.label} title={choice.label} data-dock-item tabIndex={!isActionExpanded || unavailableForFocus ? -1 : undefined} onClick={(event) => { setIsActionExpanded(false); choice.onSelect(event); }}>
                    <span className="liquid-dock__choice-icon"><MotionIcon icon={choice.icon} variant="navigation" size={19} strokeWidth={2.1} /></span>
                    <span className="liquid-dock__choice-label">{choice.label}</span>
                  </button>)}
                </span>}
              </div>
            );
          }

          const itemIndex = action && slot > actionSlot ? slot - 1 : slot;
          const item = items[itemIndex];
          if (!item) return null;

          return (
            <LiquidDockItem
              key={item.id}
              item={item}
              active={item.id === activeId && !item.disabled}
              hidden={unavailableForFocus}
              onSelect={() => onSelect(item.id)}
            />
          );
        })}
      </span>
    </GlassSurface>
  );
});
