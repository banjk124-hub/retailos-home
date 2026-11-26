import { Activity, AlertCircle, BellRing, CheckCircle2, Clock3, Download, History, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import type { SnapshotNotice } from '../../features/home/snapshotNoticeRules';
import type { UpdateCenterEntry } from '../../shared/pwa/updateCenterStore';

type Props = {
  notices: SnapshotNotice[];
  noticeStatus: 'loading' | 'ready' | 'empty' | 'unavailable';
  updateEntry: UpdateCenterEntry | null;
  onOpenNotice: (notice: SnapshotNotice, trigger: HTMLButtonElement) => void;
  onOpenUpdateCenter: () => void;
};

function updateStatusLabel(entry: UpdateCenterEntry) {
  if (entry.status === 'downloading') return 'Đang tải bản cập nhật';
  if (entry.status === 'staged') return 'Đã tải · Chờ xác nhận';
  if (entry.status === 'error') return 'Cần xử lý lỗi cập nhật';
  if (entry.status === 'deferred') return 'Đã để sau';
  return 'Đang chờ xử lý';
}

export function ActivityCenter({ notices, noticeStatus, updateEntry, onOpenNotice, onOpenUpdateCenter }: Props) {
  const pendingUpdate = updateEntry?.inCenter ? updateEntry : null;
  const signalCount = notices.length + (pendingUpdate ? 1 : 0);

  return (
    <section className="retailos-activity" id="activity" aria-labelledby="retailos-activity-title">
      <header className="retailos-activity__header">
        <div>
          <span className="retailos-activity__eyebrow">RETAILOS · ACTIVITY CENTER</span>
          <h2 id="retailos-activity-title">Trung tâm hoạt động</h2>
          <p>Tín hiệu vận hành và trạng thái hệ thống đang được ghi nhận trên thiết bị</p>
        </div>
        <span className="retailos-activity__count"><strong>{signalCount}</strong><span>đang cần chú ý</span></span>
      </header>

      <div className="retailos-activity__section-heading">
        <span><ShieldAlert size={16} /> TÍN HIỆU HIỆN TẠI</span>
        <span>{signalCount} mục</span>
      </div>

      <div className="retailos-activity__signals">
        {noticeStatus === 'loading' && <div className="retailos-activity__state" role="status"><RefreshCw size={17} /><span>Đang kiểm tra snapshot đã lưu trên thiết bị…</span></div>}
        {noticeStatus === 'unavailable' && <div className="retailos-activity__state is-warning" role="alert"><WifiOff size={17} /><span>Không thể đọc snapshot. Chưa thể xác nhận đầy đủ các cảnh báo vận hành.</span></div>}
        {noticeStatus === 'empty' && <div className="retailos-activity__state"><BellRing size={17} /><span>Chưa có snapshot trên thiết bị để tính cảnh báo.</span></div>}
        {noticeStatus === 'ready' && notices.length === 0 && <div className="retailos-activity__state"><CheckCircle2 size={17} /><span>Không phát hiện cảnh báo trong snapshot đang lưu.</span></div>}
        {notices.map((notice) => (
          <button key={notice.id} type="button" className={`retailos-activity__signal tone-${notice.tone}`} onClick={(event) => onOpenNotice(notice, event.currentTarget)}>
            <span className="retailos-activity__signal-icon"><AlertCircle size={18} /></span>
            <span className="retailos-activity__signal-copy"><small>{notice.category} · SNAPSHOT {new Date(notice.snapshotDate).toLocaleDateString('vi-VN')}</small><strong>{notice.title}</strong><span>{notice.summary}</span></span>
            <span className="retailos-activity__signal-action">Chi tiết <Activity size={15} /></span>
          </button>
        ))}
        {pendingUpdate && (
          <button type="button" className="retailos-activity__signal tone-blue" onClick={onOpenUpdateCenter}>
            <span className="retailos-activity__signal-icon"><Download size={18} /></span>
            <span className="retailos-activity__signal-copy"><small>SYSTEM UPDATE · BUILD {pendingUpdate.buildId}</small><strong>{pendingUpdate.title}</strong><span>{pendingUpdate.summary}</span><em>{updateStatusLabel(pendingUpdate)}</em></span>
            <span className="retailos-activity__signal-action">Mở Update Center <Activity size={15} /></span>
          </button>
        )}
      </div>

      <div className="retailos-activity__history">
        <div className="retailos-activity__section-heading"><span><History size={16} /> LỊCH SỬ HOẠT ĐỘNG</span><span>EVENT LOG</span></div>
        <div className="retailos-activity__history-empty">
          <span><Clock3 size={19} /></span>
          <div><strong>Chưa có nhật ký hoạt động tổng quát</strong><p>RetailOS hiện chưa kết nối nguồn event log tập trung. Khu vực này sẽ chỉ hiển thị lịch sử khi có dữ liệu sự kiện thực tế.</p></div>
        </div>
      </div>
    </section>
  );
}
