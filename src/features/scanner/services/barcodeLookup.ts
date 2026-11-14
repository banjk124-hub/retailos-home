import { getCachedModuleSnapshots } from '../../data/moduleDataService';

const lookupSources = [
  { moduleId: 'products', label: 'Danh mục hàng hóa' },
  { moduleId: 'inventory', label: 'Tồn kho' },
  { moduleId: 'price', label: 'Giá & vốn' },
  { moduleId: 'product-dates', label: 'Date sản phẩm' },
] as const;

const barcodeFieldNames = new Set([
  'barcode',
  'barcodenumber',
  'ean',
  'ean8',
  'ean13',
  'upc',
  'upca',
  'upce',
  'gtin',
  'sku',
  'productcode',
  'itemcode',
  'ma vach',
  'ma san pham',
  'ma hang',
].map(normalizeFieldName));

export type BarcodeProductRecord = {
  source: string;
  values: Array<{ label: string; value: string }>;
};

export type BarcodeLookupResult = {
  records: BarcodeProductRecord[];
  failedSources: string[];
};

function normalizeFieldName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/[^a-z0-9]/g, '');
}

function normalizeCode(value: string): string {
  return value.trim().toLocaleLowerCase('vi').replace(/\s+/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data) || !Array.isArray(data.rows)) return [];
  return data.rows.filter(isRecord);
}

function formatLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toLocaleUpperCase('vi'));
}

function formatValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function rowMatchesCode(row: Record<string, unknown>, barcode: string): boolean {
  return Object.entries(row).some(([key, value]) => {
    if (!barcodeFieldNames.has(normalizeFieldName(key))) return false;
    const formatted = formatValue(value);
    return formatted !== null && normalizeCode(formatted) === normalizeCode(barcode);
  });
}

function toProductRecord(row: Record<string, unknown>, source: string): BarcodeProductRecord {
  const values = Object.entries(row).flatMap(([key, value]) => {
    const formatted = formatValue(value);
    return formatted === null ? [] : [{ label: formatLabel(key), value: formatted }];
  });
  return { source, values };
}

export async function lookupCachedBarcode(barcode: string): Promise<BarcodeLookupResult> {
  let snapshots: Awaited<ReturnType<typeof getCachedModuleSnapshots>>;
  try {
    snapshots = await getCachedModuleSnapshots(lookupSources.map(({ moduleId }) => moduleId));
  } catch (error) {
    console.error('Không thể đọc snapshot để tra cứu mã vạch:', error);
    return { records: [], failedSources: lookupSources.map(({ label }) => label) };
  }

  const snapshotsById = new Map(snapshots.map((snapshot) => [snapshot.moduleId, snapshot]));
  const records = lookupSources.flatMap(({ moduleId, label }) => {
    const snapshot = snapshotsById.get(moduleId);
    if (!snapshot) return [];
    return getRows(snapshot.data)
      .filter((row) => rowMatchesCode(row, barcode))
      .map((row) => toProductRecord(row, label));
  });
  return { records, failedSources: [] };
}
