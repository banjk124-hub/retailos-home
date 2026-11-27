/** Snapshot dataset identity. Deliberately distinct from Home RetailModuleId workflow identity. */
export type SnapshotModuleId =
  | 'inventory' | 'price' | 'orders' | 'sales' | 'products' | 'delivery' | 'product-dates' | 'stocktake';

/** Read-only snapshot shape consumed by features; Data owns fetching, parsing and persistence. */
export type CachedModuleSnapshot = {
  moduleId: SnapshotModuleId;
  version: string;
  snapshotDate: string;
  cachedAt: string;
  data: unknown;
};
