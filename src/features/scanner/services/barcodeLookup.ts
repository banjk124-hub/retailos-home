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

function toProductRecord(row: Record<string, unknown>, source: string): BarcodeProductRecord {
  const values = Object.entries(row).flatMap(([key, value]) => {
    const formatted = formatValue(value);
    return formatted === null ? [] : [{ label: formatLabel(key), value: formatted }];
  });
  return { source, values };
}

function splitBarcodeValues(value: string): string[] {
  return value.split(/[;,|\n\r]+/).map(normalizeCode).filter(Boolean);
}

function scoreTextMatch(value: string, query: string, tokens: string[]): number {
  const normalized = normalizeSearchText(value);
  if (!normalized) return 0;
  if (normalized === query) return 1000;
  if (normalized.startsWith(query)) return 700;
  if (normalized.includes(query)) return 500;
  const matchedTokens = tokens.filter((token) => normalized.includes(token));
  if (matchedTokens.length === tokens.length) return 350 + matchedTokens.length * 10;
  if (matchedTokens.length > 0) return 100 + matchedTokens.length * 10;
  return 0;
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi').replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreRow(row: Record<string, unknown>, query: string): number {
  const tokens = query.split(' ').filter(Boolean);
  let best = 0;
  for (const [key, value] of Object.entries(row)) {
    const formatted = formatValue(value);
    if (!formatted) continue;
    const fieldName = normalizeFieldName(key);
    const isBarcodeField = barcodeFieldNames.has(fieldName);
    if (typeof value !== 'string' && !isBarcodeField) continue;
    const valueScore = scoreTextMatch(formatted, query, tokens);
    const fieldBoost = /^(itemname|productname|name|tenhanghoa|tensanpham|description)$/.test(fieldName) ? 35 : 0;
    best = Math.max(best, valueScore > 0 ? valueScore + fieldBoost : 0);
    if (isBarcodeField) {
      const exactBarcode = splitBarcodeValues(formatted).some((code) => code === normalizeCode(query));
      if (exactBarcode) best = Math.max(best, 1200);
    }
  }
  return best;
}

async function readLookupSnapshots(): Promise<{ snapshots: Awaited<ReturnType<typeof getCachedModuleSnapshots>>; failedSources: string[] }> {
  const snapshots = await getCachedModuleSnapshots(lookupSources.map(({ moduleId }) => moduleId));
  const availableIds = new Set(snapshots.map(({ moduleId }) => moduleId));
  return {
    snapshots,
    failedSources: lookupSources.filter(({ moduleId }) => !availableIds.has(moduleId)).map(({ label }) => label),
  };
}

export async function searchCachedProducts(queryValue: string): Promise<BarcodeLookupResult> {
  const query = normalizeSearchText(queryValue);
  if (!query) return { records: [], failedSources: [] };

  let result: Awaited<ReturnType<typeof readLookupSnapshots>>;
  try {
    result = await readLookupSnapshots();
  } catch (error) {
    console.error('Không thể đọc snapshot để tra cứu sản phẩm:', error);
    return { records: [], failedSources: lookupSources.map(({ label }) => label) };
  }

  const ranked = result.snapshots.flatMap((snapshot) => {
    const source = lookupSources.find(({ moduleId }) => moduleId === snapshot.moduleId)?.label ?? snapshot.moduleId;
    return getRows(snapshot.data).flatMap((row) => {
      const score = scoreRow(row, query);
      return score > 0 ? [{ record: toProductRecord(row, source), score }] : [];
    });
  }).sort((a, b) => b.score - a.score);

  return { records: ranked.slice(0, 60).map(({ record }) => record), failedSources: result.failedSources };
}

export async function lookupCachedBarcode(barcode: string): Promise<BarcodeLookupResult> {
  let result: Awaited<ReturnType<typeof readLookupSnapshots>>;
  try {
    result = await readLookupSnapshots();
  } catch (error) {
    console.error('Không thể đọc snapshot để tra cứu mã vạch:', error);
    return { records: [], failedSources: lookupSources.map(({ label }) => label) };
  }

  const normalizedBarcode = normalizeCode(barcode);
  const records = result.snapshots.flatMap((snapshot) => {
    const source = lookupSources.find(({ moduleId }) => moduleId === snapshot.moduleId)?.label ?? snapshot.moduleId;
    return getRows(snapshot.data)
      .filter((row) => Object.entries(row).some(([key, value]) => {
        if (!barcodeFieldNames.has(normalizeFieldName(key))) return false;
        const formatted = formatValue(value);
        return formatted !== null && splitBarcodeValues(formatted).includes(normalizedBarcode);
      }))
      .map((row) => toProductRecord(row, source));
  });
  return { records, failedSources: result.failedSources };
}
