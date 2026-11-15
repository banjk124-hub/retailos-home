export type UpdateCenterStatus = 'available' | 'deferred' | 'downloading' | 'staged' | 'error';
export type UpdateCenterEntry = { buildId: string; version: string; title: string; summary: string; status: UpdateCenterStatus; updatedAt: string };
const STORAGE_KEY = 'retailos.pwa.update-center.v1';
export const UPDATE_CENTER_CHANGED_EVENT = 'retailos:update-center-changed';
function emit() { if (typeof window !== 'undefined') window.dispatchEvent(new Event(UPDATE_CENTER_CHANGED_EVENT)); }
export function readUpdateCenterEntry(): UpdateCenterEntry | null {
  try { const value = localStorage.getItem(STORAGE_KEY); if (!value) return null; const parsed = JSON.parse(value) as UpdateCenterEntry; return parsed && typeof parsed.buildId === 'string' && typeof parsed.version === 'string' ? parsed : null; } catch { return null; }
}
export function writeUpdateCenterEntry(entry: UpdateCenterEntry) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)); } catch { /* The active app remains usable if storage is unavailable. */ }
  emit();
}
export function clearUpdateCenterEntry(buildId?: string) {
  const current = readUpdateCenterEntry(); if (buildId && current?.buildId !== buildId) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Best effort. */ } emit();
}
export function getPendingUpdateNoticeCount() { const entry = readUpdateCenterEntry(); return entry && ['available', 'deferred', 'staged', 'error'].includes(entry.status) ? 1 : 0; }
