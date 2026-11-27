import { Activity, Boxes, CalendarDays, Check, ChartNoAxesCombined, ClipboardList, Compass, CreditCard, FileSpreadsheet, House, PackageOpen, PackageSearch, Settings, Truck, Warehouse } from 'lucide-react';
import type { ModuleLibraryId, RetailModuleId } from './moduleRegistry';
import type { RetailIcon } from '../../shared/icons';

export const MODULE_ICON_REGISTRY: Record<RetailModuleId, RetailIcon> = {
  inventory: Warehouse, price: CreditCard, orders: ClipboardList, sales: Activity, products: PackageSearch,
  delivery: Truck, 'product-dates': CalendarDays, stocktake: Check, 'stocktake-import': FileSpreadsheet,
};
export const LIBRARY_ICON_REGISTRY: Record<ModuleLibraryId, RetailIcon> = {
  'goods-control': Warehouse, 'goods-processing': Truck, sales: Activity, 'product-dates': CalendarDays, stocktake: Check,
};
export const HOME_NAV_ICON_REGISTRY = { home: House, modules: Boxes, activity: ChartNoAxesCombined, settings: Settings }
  satisfies Record<'home' | 'modules' | 'activity' | 'settings', RetailIcon>;
const moduleLookup: Partial<Record<string, RetailIcon>> = { ...MODULE_ICON_REGISTRY };
const libraryLookup: Partial<Record<string, RetailIcon>> = { ...LIBRARY_ICON_REGISTRY };
const navLookup: Partial<Record<string, RetailIcon>> = { ...HOME_NAV_ICON_REGISTRY };
export function getModuleIcon(id: string): RetailIcon { return moduleLookup[id] || PackageOpen; }
export function getLibraryIcon(id: string): RetailIcon { return libraryLookup[id] || Boxes; }
export function getHomeNavigationIcon(id: string): RetailIcon { return navLookup[id] || Compass; }
