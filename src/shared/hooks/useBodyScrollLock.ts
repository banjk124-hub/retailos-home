import { useEffect } from 'react';
import { acquireBodyScrollLock } from '../services/bodyScrollLock.js';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return acquireBodyScrollLock();
  }, [active]);
}
