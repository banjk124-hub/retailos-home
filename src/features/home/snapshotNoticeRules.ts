import type { CachedModuleSnapshot, ModuleDataId } from '../data/moduleDataService';

export type SnapshotNotice = {
  id: string;
  title: string;
  summary: string;
  details: string;
  category: string;
  moduleId: ModuleDataId;
  tone: string;
  snapshotDate: string;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function readRows(data: unknown): unknown[] {
  const value = asRecord(data);
  const rows = Array.isArray(data) ? data : value?.rows;
  return Array.isArray(rows) ? rows : [];
}

function readNumber(record: Record<string, unknown>, primary: string, fallback: string): number | undefined {
  return typeof record[primary] === 'number' ? record[primary] as number
    : typeof record[fallback] === 'number' ? record[fallback] as number
      : undefined;
}

function countRows(data: unknown, matches: (record: Record<string, unknown>) => boolean): number {
  let count = 0;
  for (const row of readRows(data)) {
    const record = asRecord(row);
    if (record && matches(record)) count += 1;
  }
  return count;
}

export const HOME_NOTICE_MODULE_IDS: readonly ModuleDataId[] = [
  'inventory',
  'product-dates',
  'sales',
];
export function calculateSnapshotNotices(snapshots: CachedModuleSnapshot[], now = new Date()): SnapshotNotice[] {
  const notices: SnapshotNotice[] = [];
  const inventory = snapshots.find((snapshot) => snapshot.moduleId === 'inventory');
  if (inventory) {
    const lowStockCount = countRows(inventory.data, (record) => {
      const quantity = readNumber(record, 'quantity', 'stock');
      const minimumQuantity = readNumber(record, 'minimumQuantity', 'reorderPoint');
      return quantity !== undefined && minimumQuantity !== undefined && quantity <= minimumQuantity;
    });
    if (lowStockCount > 0) {
      notices.push({
        id: 'low-stock',
        title: 'Hàng hóa cần bổ sung',
        summary: `${lowStockCount} mặt hàng chạm hoặc thấp hơn định mức tồn.`,
        details: 'Cảnh báo được tính từ snapshot tồn kho và định mức tối thiểu đã đồng bộ.',
        category: 'KIỂM SOÁT HÀNG HÓA',
        moduleId: 'inventory',
        tone: 'amber',
        snapshotDate: inventory.snapshotDate,
      });
    }
  }

  const productDates = snapshots.find((snapshot) => snapshot.moduleId === 'product-dates');
  if (productDates) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 7);
    const dueCount = countRows(productDates.data, (record) => {
      const expiryDateValue = typeof record.expiryDate === 'string' ? record.expiryDate
        : typeof record.expirationDate === 'string' ? record.expirationDate
          : undefined;
      if (!expiryDateValue) return false;
      const expiryDate = new Date(expiryDateValue);
      return Number.isFinite(expiryDate.getTime()) && expiryDate <= cutoff;
    });
    if (dueCount > 0) {
      notices.push({
        id: 'product-dates',
        title: 'Sản phẩm gần hoặc đã đến date',
        summary: `${dueCount} mặt hàng có hạn dùng trong 7 ngày tới hoặc đã quá hạn.`,
        details: 'Cảnh báo được tính ở frontend từ ngày hạn sử dụng trong snapshot sản phẩm.',
        category: 'DATE SẢN PHẨM',
        moduleId: 'product-dates',
        tone: 'rose',
        snapshotDate: productDates.snapshotDate,
      });
    }
  }

  const sales = snapshots.find((snapshot) => snapshot.moduleId === 'sales');
  if (sales) {
    const belowTargetCount = countRows(sales.data, (record) => {
      const salesAmount = readNumber(record, 'salesAmount', 'amount');
      const salesTarget = readNumber(record, 'salesTarget', 'target');
      return salesAmount !== undefined && salesTarget !== undefined && salesAmount < salesTarget;
    });
    if (belowTargetCount > 0) {
      notices.push({
        id: 'sales-target',
        title: 'Doanh số dưới mục tiêu',
        summary: `${belowTargetCount} chỉ tiêu doanh số đang thấp hơn mức mục tiêu.`,
        details: 'Cảnh báo được tính ở frontend bằng cách đối chiếu doanh số thực tế và mục tiêu trong snapshot.',
        category: 'DOANH SỐ',
        moduleId: 'sales',
        tone: 'blue',
        snapshotDate: sales.snapshotDate,
      });
    }
  }

  return notices;
}
