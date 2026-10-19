import { Activity, CalendarDays, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CachedModuleSnapshot } from '../data/moduleDataService';

export type SnapshotNotice = {
  id: string;
  title: string;
  summary: string;
  details: string;
  category: string;
  icon: LucideIcon;
  tone: string;
  snapshotDate: string;
};

type SnapshotRow = {
  name: string;
  quantity?: number;
  minimumQuantity?: number;
  expiryDate?: string;
  salesAmount?: number;
  salesTarget?: number;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function readRows(data: unknown): SnapshotRow[] {
  const value = asRecord(data);
  const rows = Array.isArray(data) ? data : value?.rows;
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row): SnapshotRow[] => {
    const record = asRecord(row);
    if (!record) return [];

    const name = typeof record.name === 'string' ? record.name
      : typeof record.productName === 'string' ? record.productName
        : typeof record.itemName === 'string' ? record.itemName
          : '';
    const quantity = typeof record.quantity === 'number' ? record.quantity
      : typeof record.stock === 'number' ? record.stock
        : undefined;
    const minimumQuantity = typeof record.minimumQuantity === 'number' ? record.minimumQuantity
      : typeof record.reorderPoint === 'number' ? record.reorderPoint
        : undefined;
    const expiryDate = typeof record.expiryDate === 'string' ? record.expiryDate
      : typeof record.expirationDate === 'string' ? record.expirationDate
        : undefined;
    const salesAmount = typeof record.salesAmount === 'number' ? record.salesAmount
      : typeof record.amount === 'number' ? record.amount
        : undefined;
    const salesTarget = typeof record.salesTarget === 'number' ? record.salesTarget
      : typeof record.target === 'number' ? record.target
        : undefined;

    return [{ name: name || 'Sản phẩm', quantity, minimumQuantity, expiryDate, salesAmount, salesTarget }];
  });
}

export function calculateSnapshotNotices(snapshots: CachedModuleSnapshot[], now = new Date()): SnapshotNotice[] {
  const notices: SnapshotNotice[] = [];
  const inventory = snapshots.find((snapshot) => snapshot.moduleId === 'inventory');
  if (inventory) {
    const lowStockCount = readRows(inventory.data).filter((row) =>
      row.quantity !== undefined && row.minimumQuantity !== undefined && row.quantity <= row.minimumQuantity,
    ).length;
    if (lowStockCount > 0) {
      notices.push({
        id: 'low-stock',
        title: 'Hàng hóa cần bổ sung',
        summary: `${lowStockCount} mặt hàng chạm hoặc thấp hơn định mức tồn.`,
        details: 'Cảnh báo được tính từ snapshot tồn kho và định mức tối thiểu đã đồng bộ.',
        category: 'KIỂM SOÁT HÀNG HÓA',
        icon: Warehouse,
        tone: 'amber',
        snapshotDate: inventory.snapshotDate,
      });
    }
  }

  const productDates = snapshots.find((snapshot) => snapshot.moduleId === 'product-dates');
  if (productDates) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 7);
    const dueCount = readRows(productDates.data).filter((row) => {
      if (!row.expiryDate) return false;
      const expiryDate = new Date(row.expiryDate);
      return Number.isFinite(expiryDate.getTime()) && expiryDate <= cutoff;
    }).length;
    if (dueCount > 0) {
      notices.push({
        id: 'product-dates',
        title: 'Sản phẩm gần hoặc đã đến date',
        summary: `${dueCount} mặt hàng có hạn dùng trong 7 ngày tới hoặc đã quá hạn.`,
        details: 'Cảnh báo được tính ở frontend từ ngày hạn sử dụng trong snapshot sản phẩm.',
        category: 'DATE SẢN PHẨM',
        icon: CalendarDays,
        tone: 'rose',
        snapshotDate: productDates.snapshotDate,
      });
    }
  }

  const sales = snapshots.find((snapshot) => snapshot.moduleId === 'sales');
  if (sales) {
    const belowTargetCount = readRows(sales.data).filter((row) =>
      row.salesAmount !== undefined && row.salesTarget !== undefined && row.salesAmount < row.salesTarget,
    ).length;
    if (belowTargetCount > 0) {
      notices.push({
        id: 'sales-target',
        title: 'Doanh số dưới mục tiêu',
        summary: `${belowTargetCount} chỉ tiêu doanh số đang thấp hơn mức mục tiêu.`,
        details: 'Cảnh báo được tính ở frontend bằng cách đối chiếu doanh số thực tế và mục tiêu trong snapshot.',
        category: 'DOANH SỐ',
        icon: Activity,
        tone: 'blue',
        snapshotDate: sales.snapshotDate,
      });
    }
  }

  return notices;
}
