import type { ImportedStocktakeRow, StocktakeImportResult } from './stocktakeImportParser';

const DATABASE_NAME = 'retailos-stocktake-import';
const DATABASE_VERSION = 1;
const HISTORY_STORE = 'history';

export type StocktakeImportHistoryItem = {
  id: string;
  sourceFileName: string;
  sourceFiles?: Array<{ name: string; fingerprint: string; size: number; lastModified: number }>;
  importedAt: string;
  zoneCount: number;
  rowCount: number;
  warnings?: string[];
  blockingIssues?: string[];
  files: Array<{
    zoneCode: string;
    fileName: string;
    content: string;
    rowCount: number;
    rows?: ImportedStocktakeRow[];
  }>;
};

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Trình duyệt không hỗ trợ bộ nhớ cục bộ IndexedDB.'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(HISTORY_STORE)) {
        request.result.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở lịch sử Nạp file kiểm kê.'));
    request.onblocked = () => reject(new Error('Lịch sử Nạp file đang được mở ở tab khác.'));
  });
}

async function withHistoryStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(HISTORY_STORE, mode);
      const request = action(transaction.objectStore(HISTORY_STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error('Không thể truy cập lịch sử Nạp file.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error('Giao dịch lịch sử Nạp file thất bại.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Giao dịch lịch sử Nạp file bị hủy.'));
    });
  } finally {
    db.close();
  }
}

function createHistoryId(): string {
  return 'import_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export const stocktakeImportStore = {
  getHistory: () => withHistoryStore<StocktakeImportHistoryItem[]>('readonly', (store) => store.getAll())
    .then((items) => items.sort((a, b) => b.importedAt.localeCompare(a.importedAt))),

  saveResult: async (result: StocktakeImportResult, existingId?: string): Promise<string> => {
    const id = existingId ?? createHistoryId();
    const item: StocktakeImportHistoryItem = {
      id,
      sourceFileName: result.sourceFileName,
      sourceFiles: result.sourceFiles ? result.sourceFiles.map((source) => ({ ...source })) : undefined,
      importedAt: result.importedAt,
      zoneCount: result.zones.length,
      rowCount: result.zones.reduce((total, zone) => total + zone.rows.length, 0),
      warnings: [...result.warnings],
      blockingIssues: [...result.blockingIssues],
      files: result.zones.map((zone) => ({
        zoneCode: zone.zoneCode,
        fileName: zone.fileName,
        content: zone.content,
        rowCount: zone.rows.length,
        rows: zone.rows.map((row) => ({ ...row, issues: [...row.issues] })),
      })),
    };
    await withHistoryStore<IDBValidKey>('readwrite', (store) => store.put(item));
    return id;
  },

  clearHistory: () => withHistoryStore<undefined>('readwrite', (store) => store.clear()).then(() => undefined),
};
