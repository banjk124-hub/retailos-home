import { useEffect, useState } from 'react';
import { getCachedModuleSnapshots, MODULE_SNAPSHOTS_UPDATED_EVENT } from '../../data/moduleDataService';
import { calculateSnapshotNotices, HOME_NOTICE_MODULE_IDS, type SnapshotNotice } from '../snapshotNoticeRules';

export type SnapshotNoticeStatus = 'loading' | 'ready' | 'empty' | 'unavailable';

export function useHomeSnapshotNotices() {
  const [priorityNotices, setPriorityNotices] = useState<SnapshotNotice[]>([]);
  const [snapshotNoticeStatus, setSnapshotNoticeStatus] = useState<SnapshotNoticeStatus>('loading');

  useEffect(() => {
    let isCurrent = true;
    const loadSnapshotNotices = async () => {
      setSnapshotNoticeStatus('loading');
      try {
        const snapshots = await getCachedModuleSnapshots(HOME_NOTICE_MODULE_IDS);
        if (!isCurrent) return;
        setPriorityNotices(calculateSnapshotNotices(snapshots));
        setSnapshotNoticeStatus(snapshots.length === 0 ? 'empty' : 'ready');
      } catch (error) {
        if (!isCurrent) return;
        console.error('Không thể đọc snapshot để tính thông báo:', error);
        setPriorityNotices([]);
        setSnapshotNoticeStatus('unavailable');
      }
    };

    void loadSnapshotNotices();
    window.addEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    return () => {
      isCurrent = false;
      window.removeEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    };
  }, []);

  return { priorityNotices, snapshotNoticeStatus };
}
