import { MotionIcon } from '../icons';
import type { LiquidDockItemDefinition } from './LiquidDock.types';

type Props = {
  item: LiquidDockItemDefinition;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
};

export function LiquidDockItem({ item, active, hidden, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`liquid-dock__item${active ? ' is-active' : ''}`}
      data-dock-item
      aria-label={item.label}
      aria-current={active ? 'location' : undefined}
      aria-disabled={item.disabled || undefined}
      disabled={item.disabled}
      tabIndex={hidden ? -1 : undefined}
      onClick={onSelect}
    >
      <span className="liquid-dock__icon">
        <MotionIcon
          icon={item.icon}
          variant={item.id === 'home' ? 'home' : 'navigation'}
          active={active}
          state={item.disabled ? 'disabled' : active ? 'active' : 'idle'}
          size={22}
          strokeWidth={2.1}
        />
      </span>
      <span className="liquid-dock__label">{item.label}</span>
    </button>
  );
}
