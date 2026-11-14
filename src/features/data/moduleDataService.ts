export const MODULE_DATA_IDS = [
  'inventory',
  'price',
  'orders',
  'sales',
  'products',
  'delivery',
  'product-dates',
  'stocktake',
] as const;

export type ModuleDataId = typeof MODULE_DATA_IDS[number];
export const MODULE_SNAPSHOTS_UPDATED_EVENT = 'retailos:module-snapshots-updated';

export type ModuleManifestEntry = {
  version: string;
  snapshotDate: string;
};

export type ModuleManifest = {
  snapshotDate: string;
  authorizedModules: ModuleDataId[];
  modules: Partial<Record<ModuleDataId, ModuleManifestEntry>>;
};

export type CachedModuleSnapshot = {
  moduleId: ModuleDataId;
  version: string;
  snapshotDate: string;
  cachedAt: string;
  data: unknown;
};

export type ModuleSyncResult = {
  authorizedModules: ModuleDataId[];
  updatedModules: ModuleDataId[];
  unchangedModules: ModuleDataId[];
  failedModules: Array<{ moduleId: ModuleDataId; message: string }>;
  snapshotDate: string;
};

type SyncOptions = {
  accessToken: string;
  signal?: AbortSignal;
};

type SnapshotResponse = Omit<CachedModuleSnapshot, 'cachedAt'>;

const DATABASE_NAME = 'retailos-module-data';
const DATABASE_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const MODULE_DATA_ENDPOINT = import.meta.env.VITE_APPS_SCRIPT_DATA_URL;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isModuleDataId(value: unknown): value is ModuleDataId {
  return typeof value === 'string' && MODULE_DATA_IDS.includes(value as ModuleDataId);
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));
}

function parseManifest(value: unknown): ModuleManifest {
  if (!isRecord(value) || !isValidDate(value.snapshotDate) || !Array.isArray(value.authorizedModules) || !isRecord(value.modules)) {
    throw new Error('Apps Script returned an invalid module manifest.');
  }

  const authorizedModules = [...new Set(value.authorizedModules.filter(isModuleDataId))];
  if (authorizedModules.length !== value.authorizedModules.length) {
    throw new Error('Manifest contains an unknown or duplicate module ID.');
  }

  const modules: Partial<Record<ModuleDataId, ModuleManifestEntry>> = {};
  for (const moduleId of authorizedModules) {
    const entry = value.modules[moduleId];
    if (!isRecord(entry) || typeof entry.version !== 'string' || !entry.version || !isValidDate(entry.snapshotDate)) {
      throw new Error(`Manifest entry for "${moduleId}" is invalid.`);
    }
    modules[moduleId] = { version: entry.version, snapshotDate: entry.snapshotDate };
  }

  return { snapshotDate: value.snapshotDate, authorizedModules, modules };
}

function parseSnapshot(value: unknown, expectedModuleId: ModuleDataId, expectedVersion: string): SnapshotResponse {
  if (!isRecord(value) || value.moduleId !== expectedModuleId || value.version !== expectedVersion ||
      !isValidDate(value.snapshotDate) || !('data' in value)) {
    throw new Error(`Apps Script returned an invalid snapshot for "${expectedModuleId}".`);
  }
  return {
    moduleId: expectedModuleId,
    version: expectedVersion,
    snapshotDate: value.snapshotDate,
    data: value.data,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support IndexedDB cache.'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) {
        request.result.createObjectStore(SNAPSHOT_STORE, { keyPath: 'moduleId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the module data cache.'));
    request.onblocked = () => reject(new Error('Module data cache upgrade is blocked by another open app tab.'));
  });
}

async function withTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOT_STORE, mode);
      let operationResolved = false;
      let transactionCompleted = false;
      let result: T;
      let settled = false;
      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const completeIfReady = () => {
        if (settled || !operationResolved || !transactionCompleted) return;
        settled = true;
        resolve(result);
      };

      transaction.oncomplete = () => {
        transactionCompleted = true;
        completeIfReady();
      };
      transaction.onerror = () => fail(transaction.error ?? new Error('Module data cache transaction failed.'));
      transaction.onabort = () => fail(transaction.error ?? new Error('Module data cache transaction was aborted.'));

      let operationResult: Promise<T>;
      try {
        operationResult = operation(transaction.objectStore(SNAPSHOT_STORE));
      } catch (error) {
        fail(error);
        return;
      }
      operationResult.then((value) => {
        result = value;
        operationResolved = true;
        completeIfReady();
      }, fail);
    });
  } finally {
    database.close();
  }
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return withTransaction(mode, (store) => new Promise<T>((resolve, reject) => {
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Module data cache operation failed.'));
  }));
}
export function getCachedModuleSnapshot(moduleId: ModuleDataId): Promise<CachedModuleSnapshot | undefined> {
  return withStore<CachedModuleSnapshot | undefined>('readonly', (store) => store.get(moduleId));
}

/**
 * Reads only requested module records through one IndexedDB connection and
 * one readonly transaction, avoiding a database open for each Home notice source.
 */
export async function getCachedModuleSnapshots(
  moduleIds: readonly ModuleDataId[],
): Promise<CachedModuleSnapshot[]> {
  const uniqueModuleIds = [...new Set(moduleIds)];
  if (uniqueModuleIds.length === 0) return [];

  return withTransaction('readonly', (store) => Promise.all(uniqueModuleIds.map((moduleId) =>
    new Promise<CachedModuleSnapshot | undefined>((resolve, reject) => {
      const request = store.get(moduleId);
      request.onsuccess = () => resolve(request.result as CachedModuleSnapshot | undefined);
      request.onerror = () => reject(request.error ?? new Error('Module data cache operation failed.'));
    }),
  )).then((snapshots) => snapshots.filter((snapshot): snapshot is CachedModuleSnapshot => snapshot !== undefined)));
}
function putCachedSnapshot(snapshot: CachedModuleSnapshot): Promise<IDBValidKey> {
  return withStore<IDBValidKey>('readwrite', (store) => store.put(snapshot));
}

async function deleteModuleSnapshotsExcept(authorizedModules: ModuleDataId[]): Promise<void> {
  await withTransaction<void>('readwrite', (store) => new Promise<void>((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const snapshot = cursor.value as CachedModuleSnapshot;
      if (!authorizedModules.includes(snapshot.moduleId)) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('Could not reconcile module cache access.'));
  }));
}
export function clearCachedModuleData(): Promise<void> {
  return withStore<undefined>('readwrite', (store) => store.clear()).then(() => undefined);
}

async function requestJson<T>(url: URL, accessToken: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new DOMException('Request timed out.', 'TimeoutError')), 20_000);
  const forwardAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Module data API returned HTTP ${response.status}.`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function makeEndpoint(action: 'manifest' | 'snapshot', moduleId?: ModuleDataId, version?: string): URL {
  if (!MODULE_DATA_ENDPOINT) {
    throw new Error('Set VITE_APPS_SCRIPT_DATA_URL to the deployed Apps Script data API URL.');
  }
  const endpoint = new URL(MODULE_DATA_ENDPOINT);
  endpoint.searchParams.set('action', action);
  if (moduleId) endpoint.searchParams.set('module', moduleId);
  if (version) endpoint.searchParams.set('version', version);
  return endpoint;
}

/**
 * Reads one authorized manifest, then downloads only missing/changed module
 * snapshots. A verified replacement is committed as one IndexedDB record,
 * leaving the previous snapshot intact if a download fails.
 */
export async function syncAuthorizedModuleData(options: SyncOptions): Promise<ModuleSyncResult> {
  if (!options.accessToken.trim()) throw new Error('A valid data access token is required to sync module snapshots.');

  const rawManifest = await requestJson<unknown>(makeEndpoint('manifest'), options.accessToken, options.signal);
  const manifest = parseManifest(rawManifest);
  await deleteModuleSnapshotsExcept(manifest.authorizedModules);

  const updatedModules: ModuleDataId[] = [];
  const unchangedModules: ModuleDataId[] = [];
  const failedModules: ModuleSyncResult['failedModules'] = [];

  for (const moduleId of manifest.authorizedModules) {
    const manifestEntry = manifest.modules[moduleId];
    if (!manifestEntry) continue;

    try {
      const cached = await getCachedModuleSnapshot(moduleId);
      if (cached?.version === manifestEntry.version) {
        unchangedModules.push(moduleId);
        continue;
      }

      const rawSnapshot = await requestJson<unknown>(
        makeEndpoint('snapshot', moduleId, manifestEntry.version),
        options.accessToken,
        options.signal,
      );
      const snapshot = parseSnapshot(rawSnapshot, moduleId, manifestEntry.version);
      await putCachedSnapshot({ ...snapshot, cachedAt: new Date().toISOString() });
      updatedModules.push(moduleId);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      failedModules.push({
        moduleId,
        message: error instanceof Error ? error.message : 'Unknown module snapshot error.',
      });
    }
  }

  const result = {
    authorizedModules: manifest.authorizedModules,
    updatedModules,
    unchangedModules,
    failedModules,
    snapshotDate: manifest.snapshotDate,
  };
  if (updatedModules.length > 0) window.dispatchEvent(new Event(MODULE_SNAPSHOTS_UPDATED_EVENT));
  return result;
}
