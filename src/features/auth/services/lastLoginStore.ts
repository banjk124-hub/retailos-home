/** Remember only the most recently successful employee name on this device. */
const LAST_LOGIN_NAME_KEY = 'retailos.lastLoginName.v1';

export function readLastLoginName(): string {
  try { return localStorage.getItem(LAST_LOGIN_NAME_KEY) ?? ''; }
  catch { return ''; }
}

export function saveLastLoginName(name: string): void {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) return;
  try { localStorage.setItem(LAST_LOGIN_NAME_KEY, normalized); }
  catch { /* The login flow still works when browser storage is unavailable. */ }
}
