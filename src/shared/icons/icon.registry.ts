import {
  Activity,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  ChartNoAxesCombined,
  Compass,
  PackageOpen,
  PackageSearch,
  ShoppingBasket,
  Sprout,
  Shirt,
  House,
  SlidersHorizontal,
  Truck,
  Warehouse,
  Boxes,
} from 'lucide-react';
import type { DepartmentId } from '../../features/auth/types';
import type { ModuleLibraryId } from '../../features/home/moduleRegistry';
import type { ModuleDataId } from '../../features/data/moduleDataService';
import type { RetailIcon } from './icon.types';

export const DEPARTMENT_ICON_REGISTRY: Record<DepartmentId, RetailIcon> = {
  fmcg: ShoppingBasket,
  fresh: Sprout,
  softline: Shirt,
  homeline: House,
  warehouse: Warehouse,
};

export const MODULE_ICON_REGISTRY: Record<ModuleDataId, RetailIcon> = {
  inventory: Warehouse,
  price: CreditCard,
  orders: ClipboardList,
  sales: Activity,
  products: PackageSearch,
  delivery: Truck,
  'product-dates': CalendarDays,
  stocktake: Check,
};

export const LIBRARY_ICON_REGISTRY: Record<ModuleLibraryId, RetailIcon> = {
  'goods-control': Warehouse,
  'goods-processing': Truck,
  sales: Activity,
  'product-dates': CalendarDays,
  stocktake: Check,
};

export const HOME_NAV_ICON_REGISTRY = {
  home: House,
  modules: Boxes,
  activity: ChartNoAxesCombined,
  settings: SlidersHorizontal,
} satisfies Record<'home' | 'modules' | 'activity' | 'settings', RetailIcon>;

const departmentIconLookup: Partial<Record<string, RetailIcon>> = { ...DEPARTMENT_ICON_REGISTRY };
const moduleIconLookup: Partial<Record<string, RetailIcon>> = { ...MODULE_ICON_REGISTRY };
const libraryIconLookup: Partial<Record<string, RetailIcon>> = { ...LIBRARY_ICON_REGISTRY };
const homeNavIconLookup: Partial<Record<string, RetailIcon>> = { ...HOME_NAV_ICON_REGISTRY };

export function getDepartmentIcon(id: string | undefined): RetailIcon {
  return (id && departmentIconLookup[id]) || Building2;
}

export function getModuleIcon(id: string): RetailIcon {
  return moduleIconLookup[id] || PackageOpen;
}

export function getLibraryIcon(id: string): RetailIcon {
  return libraryIconLookup[id] || Boxes;
}

export function getHomeNavigationIcon(id: string): RetailIcon {
  return homeNavIconLookup[id] || Compass;
}
