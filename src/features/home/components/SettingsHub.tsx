import { Activity, BellRing, ChevronRight, ScanBarcode, Settings, X } from 'lucide-react';
import { useState } from 'react';
import { readUpdateCenterEntry, UPDATE_CENTER_CHANGED_EVENT } from '../../../shared/pwa/updateCenterStore';
import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import '../../../styles/scanner-settings.css';

type Props = {
  onClose: () => void;
  onOpenScannerSettings: () => void;
  onOpenScannerQa: () => void;
  onOpenUpdateCenter: () => void;
};

export default function SettingsHub({ onClose, onOpenScannerSettings, onOpenScannerQa, onOpenUpdateCenter }: Props) {
  const [updateEntry, setUpdateEntry] = useState(readUpdateCenterEntry);
  useEffect(() => { const sync = () => setUpdateEntry(readUpdateCenterEntry()); window.addEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); }; }, []);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return <div className="scanner-settings-backdrop" onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="scanner-settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-hub-title">
      <header className="scanner-settings-header">
        <span className="scanner-settings-header-icon"><Settings size={21} /></span>
        <div>
          <span className="scanner-settings-eyebrow">RETAILOS · PREFERENCES</span>
          <h2 id="settings-hub-title">Cài đặt</h2>
          <p>Quản lý cấu hình và công cụ kiểm thử</p>
        </div>
        <button ref={closeButtonRef} type="button" className="scanner-settings-close" onClick={onClose} aria-label="Đóng cài đặt"><X size={19} /></button>
      </header>

      <div className="scanner-settings-section-label">CẬP NHẬT VÀ THÔNG BÁO</div>
      <div className="scanner-settings-menu">
        <button type="button" className="scanner-settings-menu-item" onClick={onOpenUpdateCenter}>
          <span className="scanner-settings-menu-icon"><BellRing size={20} /></span>
          <span className="scanner-settings-menu-copy"><strong>Trung tâm cập nhật {updateEntry ? '· 1' : ''}</strong><small>{updateEntry ? `${updateEntry.title} · ${updateEntry.status === 'staged' ? 'Đã tải, chờ xác nhận' : updateEntry.status === 'deferred' ? 'Đã để sau' : updateEntry.status === 'downloading' ? 'Đang tải' : 'Đang chờ xử lý'}` : 'Không có cập nhật đang chờ'}</small></span>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="scanner-settings-section-label">MÁY QUÉT BARCODE</div>
      <div className="scanner-settings-menu">
        <button type="button" className="scanner-settings-menu-item" onClick={onOpenScannerSettings}>
          <span className="scanner-settings-menu-icon"><ScanBarcode size={20} /></span>
          <span className="scanner-settings-menu-copy">
            <strong>Cài đặt máy quét</strong>
            <small>Điều chỉnh âm báo và phản hồi rung khi quét</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="scanner-settings-menu-item" onClick={onOpenScannerQa}>
          <span className="scanner-settings-menu-icon is-diagnostic"><Activity size={20} /></span>
          <span className="scanner-settings-menu-copy">
            <strong>Scanner QA Monitor</strong>
            <small>Theo dõi camera, hiệu năng và xuất dữ liệu kiểm thử</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="scanner-settings-footnote">Các tùy chọn máy quét được lưu trên thiết bị và dùng chung cho Home, Kiểm kê cùng các chức năng Scanner khác.</p>
    </section>
  </div>;
}
