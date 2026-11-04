import type { RetailIcon } from '../icons/icon.types';

export type LiquidDockItemDefinition = {
  id: string;
  label: string;
  icon: RetailIcon;
  disabled?: boolean;
};

export type LiquidDockActionDefinition = {
  label: string;
  icon: RetailIcon;
  onSelect: () => void;
  disabled?: boolean;
};

export type LiquidDockProps = {
  items: LiquidDockItemDefinition[];
  activeId: string;
  onSelect: (id: string) => void;
  action?: LiquidDockActionDefinition;
  label?: string;
  className?: string;
  hidden?: boolean;
};
