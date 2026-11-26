import { useEffect, useState } from 'react';
import { getPendingUpdateNoticeCount, UPDATE_CENTER_CHANGED_EVENT } from '../../../shared/pwa/updateCenterStore';

export function useHomeUpdateNoticeCount() {
  const [count, setCount] = useState(getPendingUpdateNoticeCount);
  useEffect(() => {
    const sync = () => setCount(getPendingUpdateNoticeCount());
    sync();
    window.addEventListener(UPDATE_CENTER_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(UPDATE_CENTER_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return count;
}
