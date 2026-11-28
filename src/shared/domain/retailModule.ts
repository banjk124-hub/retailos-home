/**
 * Stable identity for RetailOS business workflows.
 *
 * Deliberately distinct from ModuleDataId/SnapshotModuleId: workflow identity
 * may exist without a remote snapshot, and local-only workflows are valid.
 */
export const RETAIL_MODULE_IDS = [
  'inventory',
  'price',
  'orders',
  'sales',
  'products',
  'delivery',
  'product-dates',
  'stocktake',
  'stocktake-import',
] as const;

export type RetailModuleId = typeof RETAIL_MODULE_IDS[number];
