import { useEffect, useState } from 'react';
import { getCachedModuleSnapshots, MODULE_SNAPSHOTS_UPDATED_EVENT } from '../../data/moduleDataService';
import { calculateSnapshotNotices, HOME_NOTICE_MODULE_IDS, type SnapshotNotice } from '../snapshotNoticeRules';

export type SnapshotNoticeStatus = 'loading' | 'ready' | 'empty' | 'unavailable';

export function useHomeSnapshotNotices() {
  const [priorityNotices, setPriorityNotices] = useState<SnapshotNotice[]>([]);
  const [snapshotNoticeStatus, setSnapshotNoticeStatus] = useState<SnapshotNoticeStatus>('loading');

  useEffect(() => {
    let isMounted = true;
    let latestRequestId = 0;

    const loadSnapshotNotices = async () => {
      const requestId = ++latestRequestId;
      setSnapshotNoticeStatus('loading');
      try {
        const snapshots = await getCachedModuleSnapshots(HOME_NOTICE_MODULE_IDS);
        if (!isMounted || requestId !== latestRequestId) return;
        setPriorityNotices(calculateSnapshotNotices(snapshots));
        setSnapshotNoticeStatus(snapshots.length === 0 ? 'empty' : 'ready');
      } catch (error) {
        if (!isMounted || requestId !== latestRequestId) return;
        console.error('Không thể đọc snapshot để tính thông báo:', error);
        setPriorityNotices([]);
        setSnapshotNoticeStatus('unavailable');
      }
    };

    void loadSnapshotNotices();
    window.addEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    return () => {
      isMounted = false;
      latestRequestId += 1;
      window.removeEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    };
  }, []);

  return { priorityNotices, snapshotNoticeStatus };
}
