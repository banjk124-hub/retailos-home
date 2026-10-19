import type { EmployeeSession } from '../types';

/**
 * Persist only the signed-in identity needed to restore the current UI.
 * The employee code is intentionally never stored in browser storage.
 */
const SESSION_KEY = 'retailos.session.v2';
type StoredSession = Omit<EmployeeSession, 'employeeCode'>;

export function readSession(): EmployeeSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<StoredSession>;
    if (!saved.name || !saved.department || !saved.departmentId || !saved.signedInAt) return null;
    return {
      name: saved.name,
      department: saved.department,
      departmentId: saved.departmentId,
      signedInAt: saved.signedInAt,
      employeeCode: '',
    } as EmployeeSession;
  } catch {
    return null;
  }
}

export function saveSession(session: EmployeeSession): void {
  const stored: StoredSession = {
    name: session.name,
    department: session.department,
    departmentId: session.departmentId,
    signedInAt: session.signedInAt,
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(stored)); }
  catch { /* Keep current in-memory session if browser storage is unavailable. */ }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    // Remove the previous prototype key if it exists.
    localStorage.removeItem('retailos.session.v1');
  } catch { /* Storage may be unavailable. */ }
}
