import { Activity, ChevronRight, ScanBarcode, Settings, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

type Props = {
  onClose: () => void;
  onOpenScannerSettings: () => void;
  onOpenScannerQa: () => void;
};

export default function SettingsHub({ onClose, onOpenScannerSettings, onOpenScannerQa }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
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
