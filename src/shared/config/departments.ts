import { House, Shirt, ShoppingBasket, Sprout, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DepartmentId } from '../../features/auth/types';

export type DepartmentConfig = {
  id: DepartmentId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  symbol: string;
  tagline: string;
  motion: string;
  greeting: string;
};

export const DEPARTMENTS: DepartmentConfig[] = [
  { id: 'fmcg', label: 'FMCG', shortLabel: 'FMCG', icon: ShoppingBasket, symbol: '✳', tagline: 'Hàng tiêu dùng nhanh', motion: 'pulse', greeting: 'Sẵn sàng cho nhịp vận hành hôm nay.' },
  { id: 'fresh', label: 'FRESH', shortLabel: 'FRESH', icon: Sprout, symbol: '✿', tagline: 'Thực phẩm tươi sống', motion: 'bloom', greeting: 'Tươi mới trong từng thao tác.' },
  { id: 'softline', label: 'SOFTLINE', shortLabel: 'SOFTLINE', icon: Shirt, symbol: '✦', tagline: 'Thời trang & hàng mềm', motion: 'drift', greeting: 'Mọi danh mục trong tầm kiểm soát.' },
  { id: 'homeline', label: 'HOMELINE', shortLabel: 'HOMELINE', icon: House, symbol: '⌂', tagline: 'Gia dụng & hàng nhà cửa', motion: 'orbit', greeting: 'Sắp xếp công việc thật nhẹ nhàng.' },
  { id: 'warehouse', label: 'WARE HOUSE', shortLabel: 'WARE HOUSE', icon: Warehouse, symbol: '▦', tagline: 'Kho tổng & giao nhận', motion: 'slide', greeting: 'Theo dõi luồng hàng rõ ràng hơn.' },
];

export function getDepartment(id: DepartmentId | string | undefined): DepartmentConfig | undefined {
  return DEPARTMENTS.find((department) => department.id === id || department.label === id);
}
