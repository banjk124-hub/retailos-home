import type { MouseEvent } from 'react';
import type { RetailIcon } from '../icons/icon.types';

export type LiquidDockItemDefinition = {
  id: string;
  label: string;
  icon: RetailIcon;
  disabled?: boolean;
  noticeCount?: number;
};

export type LiquidDockActionChoice = {
  id: string;
  label: string;
  icon: RetailIcon;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type LiquidDockActionDefinition = {
  label: string;
  icon: RetailIcon;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  choices?: LiquidDockActionChoice[];
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
