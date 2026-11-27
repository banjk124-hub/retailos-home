import { Building2, House, Shirt, ShoppingBasket, Sprout, Warehouse } from 'lucide-react';
import type { DepartmentId } from '../domain/department';
import type { RetailIcon } from './icon.types';

export const DEPARTMENT_ICON_REGISTRY: Record<DepartmentId, RetailIcon> = {
  fmcg: ShoppingBasket, fresh: Sprout, softline: Shirt, homeline: House, warehouse: Warehouse,
};
const departmentIconLookup: Partial<Record<string, RetailIcon>> = { ...DEPARTMENT_ICON_REGISTRY };
export function getDepartmentIcon(id: string | undefined): RetailIcon {
  return (id && departmentIconLookup[id]) || Building2;
}
