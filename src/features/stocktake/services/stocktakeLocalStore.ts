import type { StocktakeActionLog, StocktakeEntry, StocktakeExport, StocktakeSession, StocktakeZone } from '../types/stocktake.types';

const DB_NAME = 'retailos-stocktake';
const DB_VERSION = 1;
const STORES = ['sessions', 'zones', 'entries', 'logs', 'exports'] as const;
type StoreName = typeof STORES[number];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('zones')) db.createObjectStore('zones', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('exports')) db.createObjectStore('exports', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở dữ liệu kiểm kê.'));
    request.onblocked = () => reject(new Error('Cơ sở dữ liệu kiểm kê đang được mở ở tab khác.'));
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Không thể truy cập dữ liệu kiểm kê.'));
      tx.onabort = () => reject(tx.error ?? new Error('Thao tác kiểm kê bị hủy.'));
    });
  } finally {
    db.close();
  }
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  return withStore(store, 'readonly', (objectStore) => objectStore.getAll());
}

export const stocktakeStore = {
  getSessions: () => getAll<StocktakeSession>('sessions'),
  getZones: () => getAll<StocktakeZone>('zones'),
  getEntries: () => getAll<StocktakeEntry>('entries'),
  getLogs: () => getAll<StocktakeActionLog>('logs'),
  getExports: () => getAll<StocktakeExport>('exports'),
  putSession: (value: StocktakeSession) => withStore('sessions', 'readwrite', (store) => store.put(value)),
  putZone: (value: StocktakeZone) => withStore('zones', 'readwrite', (store) => store.put(value)),
  putEntry: (value: StocktakeEntry) => withStore('entries', 'readwrite', (store) => store.put(value)),
  putLog: (value: StocktakeActionLog) => withStore('logs', 'readwrite', (store) => store.put(value)),
  putExport: (value: StocktakeExport) => withStore('exports', 'readwrite', (store) => store.put(value)),
  deleteEntry: (id: string) => withStore('entries', 'readwrite', (store) => store.delete(id)),
  async clearAll(): Promise<void> {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([...STORES], 'readwrite');
        STORES.forEach((name) => tx.objectStore(name).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Không thể xóa dữ liệu kiểm kê.'));
        tx.onabort = () => reject(tx.error ?? new Error('Thao tác xóa dữ liệu bị hủy.'));
      });
    } finally {
      db.close();
    }
  },
};

export function createStocktakeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function logStocktakeAction(input: Omit<StocktakeActionLog, 'id' | 'timestamp'>): Promise<void> {
  await stocktakeStore.putLog({ ...input, id: createStocktakeId('log'), timestamp: new Date().toISOString() });
}
