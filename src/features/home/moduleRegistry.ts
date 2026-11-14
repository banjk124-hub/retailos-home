export const MODULE_LIBRARY_IDS = [
  'goods-control',
  'goods-processing',
  'sales',
  'product-dates',
  'stocktake',
] as const;

export type ModuleLibraryId = typeof MODULE_LIBRARY_IDS[number];

/** Workflow IDs belong to the business UI domain and must not inherit snapshot/cache IDs. */
export const RETAIL_MODULE_IDS = [
  'inventory', 'price', 'orders', 'sales', 'products', 'delivery', 'product-dates', 'stocktake', 'stocktake-import',
] as const;

export type RetailModuleId = typeof RETAIL_MODULE_IDS[number];

export type RetailModule = {
  id: RetailModuleId;
  title: string;
  description: string;
  tone: string;
  group: string;
  /** Data snapshot support is separate from whether a complete workflow UI exists. */
  dataSource: 'snapshot' | 'local';
  /** Current UI availability; independent from engineering progress. */
  availability: 'integrating' | 'ready';
  /** Informational lifecycle marker for parallel work and safe handoff; never gates runtime. */
  workStatus?: 'planned' | 'in-progress' | 'paused' | 'operational' | 'maintenance';
};

export type ModuleLibraryDefinition = {
  id: ModuleLibraryId;
  title: string;
  description: string;
  tone: string;
  moduleIds: RetailModuleId[];
};

export type ModuleLibraryGroup = ModuleLibraryDefinition & { modules: RetailModule[] };

export const MODULE_REGISTRY: RetailModule[] = [
  { id: 'inventory', title: 'Tồn kho', description: 'Tồn thực tế và định mức', tone: 'blue', group: 'Kiểm soát hàng hóa', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'price', title: 'Giá & vốn', description: 'Giá bán và giá vốn', tone: 'violet', group: 'Kiểm soát hàng hóa', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'products', title: 'Danh mục hàng hóa', description: 'Tra cứu tên và barcode', tone: 'cyan', group: 'Kiểm soát hàng hóa', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'orders', title: 'Nhập / xuất hàng', description: 'Luồng xử lý hàng hóa', tone: 'amber', group: 'Xử lý hàng hóa', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'delivery', title: 'Điều chuyển hàng', description: 'Tuyến và giao nhận', tone: 'rose', group: 'Xử lý hàng hóa', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'sales', title: 'Doanh số', description: 'Kết quả và mục tiêu bán hàng', tone: 'green', group: 'Doanh số', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'product-dates', title: 'Date sản phẩm', description: 'Hạn sử dụng và lô hàng', tone: 'amber', group: 'Date sản phẩm', dataSource: 'snapshot', availability: 'integrating' },
  { id: 'stocktake', title: 'Kiểm kê', description: 'Quét, rà soát và xuất file theo vùng', tone: 'green', group: 'Kiểm kê', dataSource: 'snapshot', availability: 'ready' },
  { id: 'stocktake-import', title: 'Xuất file', description: 'Chuẩn hóa dữ liệu và xuất TXT theo vùng', tone: 'blue', group: 'Kiểm kê', dataSource: 'local', availability: 'ready', workStatus: 'in-progress' },
];

export const MODULE_LIBRARIES: ModuleLibraryDefinition[] = [
  { id: 'goods-control', title: 'Kiểm soát hàng hóa', description: 'Tồn kho, giá và danh mục', tone: 'blue', moduleIds: ['inventory', 'price', 'products'] },
  { id: 'goods-processing', title: 'Xử lý hàng hóa', description: 'Nhập, xuất và điều chuyển', tone: 'amber', moduleIds: ['orders', 'delivery'] },
  { id: 'sales', title: 'Doanh số', description: 'Kết quả và mục tiêu bán hàng', tone: 'green', moduleIds: ['sales'] },
  { id: 'product-dates', title: 'Date sản phẩm', description: 'Theo dõi hạn sử dụng', tone: 'rose', moduleIds: ['product-dates'] },
  { id: 'stocktake', title: 'Kiểm kê', description: 'Kiểm kê trực tiếp và xuất file theo vùng', tone: 'violet', moduleIds: ['stocktake', 'stocktake-import'] },
];

