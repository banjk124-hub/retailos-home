export type UpdateCenterStatus = 'available' | 'deferred' | 'downloading' | 'staged' | 'error';
export type UpdateCenterEntry = {
  buildId: string;
  version: string;
  currentVersion?: string;
  title: string;
  summary: string;
  status: UpdateCenterStatus;
  updatedAt: string;
  /** True only after an employee explicitly defers or collapses the update notice. */
  inCenter?: boolean;
  sections?: Array<{ heading: string; items: string[] }>;
  compatibility?: string[];
  warnings?: string[];
  totalBytes?: number;
  progress?: { completed: number; total: number; bytesDownloaded: number; totalBytes: number };
  lastError?: string;
};
const STORAGE_KEY = 'retailos.pwa.update-center.v1';
export const UPDATE_CENTER_CHANGED_EVENT = 'retailos:update-center-changed';
function emit() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(UPDATE_CENTER_CHANGED_EVENT)); }
function isStatus(value: unknown): value is UpdateCenterStatus {
  return value === 'available' || value === 'deferred' || value === 'downloading' || value === 'staged' || value === 'error';
}
export function readUpdateCenterEntry(): UpdateCenterEntry | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<UpdateCenterEntry>;
    if (!parsed || typeof parsed.buildId !== 'string' || typeof parsed.version !== 'string'
      || typeof parsed.title !== 'string' || typeof parsed.summary !== 'string'
      || !isStatus(parsed.status) || typeof parsed.updatedAt !== 'string') return null;
    // Migrate only the old explicit "deferred" state into the Center.
    return { ...parsed, inCenter: parsed.inCenter === true || parsed.status === 'deferred' } as UpdateCenterEntry;
  } catch { return null; }
}
export function writeUpdateCenterEntry(entry: UpdateCenterEntry): boolean {
  const previous = readUpdateCenterEntry();
  const next = {
    ...entry,
    inCenter: entry.inCenter === true || (previous?.buildId === entry.buildId && previous.inCenter === true),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    emit();
    return false;
  }
  emit();
  return true;
}
export function clearUpdateCenterEntry(buildId?: string) {
  const current = readUpdateCenterEntry();
  if (buildId && current?.buildId !== buildId) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Best effort; boot confirmation remains authoritative. */ }
  emit();
}
export function getPendingUpdateNoticeCount() {
  const entry = readUpdateCenterEntry();
  return entry?.inCenter ? 1 : 0;
}