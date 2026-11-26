import { BellRing, ChevronLeft, ChevronRight, ScanBarcode, Settings, X, Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { readUpdateCenterEntry, UPDATE_CENTER_CHANGED_EVENT, type UpdateCenterEntry } from '../../../shared/pwa/updateCenterStore';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import '../../../styles/scanner-settings.css';

type Props = {
  onClose: () => void;
  onOpenScannerSettings: () => void;
  initialView?: 'home' | 'update-center';
};

function requestUpdateAction(action: 'download' | 'activate') {
  window.dispatchEvent(new CustomEvent('retailos:update-center-action', { detail: { action } }));
}

function UpdateCenterView({ entry, onBack }: { entry: UpdateCenterEntry | null; onBack: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activationBlockReason, setActivationBlockReason] = useState('');
  const backButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { backButtonRef.current?.focus(); }, []);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    const handleBlocked = (event: Event) => setActivationBlockReason((event as CustomEvent<{ reason?: string }>).detail?.reason ?? 'Nghiệp vụ đang hoạt động.');
    window.addEventListener('retailos:update-center-blocked', handleBlocked);
    window.addEventListener(UPDATE_CENTER_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('retailos:update-center-blocked', handleBlocked);
      window.removeEventListener(UPDATE_CENTER_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  void refreshKey;
  const stored = readUpdateCenterEntry();
  const current = stored?.inCenter ? stored : entry?.inCenter ? entry : null;
  const statusLabel = current?.status === 'downloading' ? 'Đang tải bản cập nhật'
    : current?.status === 'staged' ? 'Đã tải và xác minh · Chờ xác nhận'
      : current?.status === 'error' ? 'Có lỗi cần xử lý'
        : current?.status === 'deferred' ? 'Đã để sau' : 'Đang chờ xử lý';
  const progress = current?.progress;
  const progressPercent = progress?.totalBytes ? Math.min(100, Math.round(progress.bytesDownloaded / progress.totalBytes * 100)) : 0;
  return <section className="scanner-settings-panel scanner-settings-panel--detail update-center-view" role="dialog" aria-modal="true" aria-labelledby="update-center-title">
    <header className="scanner-settings-header">
      <button ref={backButtonRef} type="button" className="scanner-settings-back" onClick={onBack} aria-label="Quay lại cài đặt"><ChevronLeft size={19} /></button>
      <div><span className="scanner-settings-eyebrow">RETAILOS · SYSTEM UPDATE</span><h2 id="update-center-title">Trung tâm cập nhật</h2><p>Theo dõi và chủ động kiểm soát phiên bản ứng dụng</p></div>
      <button type="button" className="scanner-settings-close" onClick={onBack} aria-label="Đóng trung tâm cập nhật"><X size={19} /></button>
    </header>
    {current ? <>
      <div className="update-center-release">
        <div className="update-center-release__top"><span className="update-center-release__eyebrow">PHIÊN BẢN MỚI</span><span className="update-center-status" data-status={current.status}>{current.status === 'staged' ? <CheckCircle2 size={14}/> : current.status === 'error' ? <AlertCircle size={14}/> : <RefreshCw size={14}/>} {statusLabel}</span></div>
        <h3>{current.title}</h3>
        <p>{current.summary}</p>
        <div className="update-center-version"><span>Đang chạy {current.currentVersion || '—'}</span><strong>Mới {current.version}</strong></div>
        {current.sections?.map((section) => <div className="update-center-section" key={section.heading}><h4>{section.heading}</h4><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
        {!!current.compatibility?.length && <div className="update-center-section"><h4>Tương thích</h4><ul>{current.compatibility.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        {!!current.warnings?.length && <div className="update-center-section is-warning"><h4>Lưu ý vận hành</h4><ul>{current.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      </div>
      {current.status === 'downloading' && <div className="update-center-progress"><div><span>Tiến độ tải</span><strong>{progressPercent}%</strong></div><span className="update-center-progress__track"><i style={{ transform: 'scaleX(' + progressPercent / 100 + ')' }} /></span><small>{progress?.completed ?? 0}/{progress?.total ?? 0} tài nguyên</small></div>}
      {current.lastError && <p className="update-center-blocked" role="alert">Lỗi cập nhật: {current.lastError}</p>}
      {activationBlockReason && <p className="update-center-blocked" role="alert">Chưa thể kích hoạt: {activationBlockReason}</p>}
      <div className="update-center-actions">
        {current.status === 'staged' ? <button type="button" className="update-center-primary" onClick={() => requestUpdateAction('activate')}>Xác nhận cập nhật</button>
          : current.status === 'downloading' ? <p role="status">Đang tải trong nền. Phiên bản hiện tại vẫn hoạt động.</p>
            : <button type="button" className="update-center-primary" onClick={() => requestUpdateAction('download')}><Download size={16}/> Tải và cập nhật</button>}
      </div>
      <p className="update-center-footnote">Tải xuống không đồng nghĩa với kích hoạt. RetailOS chỉ chuyển phiên bản sau khi bạn xác nhận và hệ thống xác định không còn nghiệp vụ đang bị chặn.</p>
    </> : <div className="update-center-empty"><BellRing size={25}/><h3>Chưa có bản cập nhật được lưu</h3><p>Khi có phiên bản mới, bạn có thể chọn “Để sau” hoặc thu gọn thông báo để đưa bản cập nhật vào đây.</p></div>}
  </section>;
}

export default function SettingsHub({ onClose, onOpenScannerSettings, initialView = 'home' }: Props) {
  const [updateEntry, setUpdateEntry] = useState(readUpdateCenterEntry);
  const [showUpdateCenter, setShowUpdateCenter] = useState(initialView === 'update-center');
  useEffect(() => { const sync = () => setUpdateEntry(readUpdateCenterEntry()); window.addEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); }; }, []);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(true);
  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (showUpdateCenter) setShowUpdateCenter(false); else onClose(); } };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, showUpdateCenter]);
  if (showUpdateCenter) return <div className="scanner-settings-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowUpdateCenter(false); }}>
    <UpdateCenterView entry={updateEntry} onBack={() => setShowUpdateCenter(false)} />
  </div>;
  return <div className="scanner-settings-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="scanner-settings-panel settings-experience" role="dialog" aria-modal="true" aria-labelledby="settings-hub-title">
      <header className="settings-experience__header">
        <div className="settings-experience__identity">
          <span className="settings-experience__mark"><Settings size={20} /></span>
          <div><span className="scanner-settings-eyebrow">RETAILOS · SYSTEM</span><h2 id="settings-hub-title">Cài đặt</h2><p>Không gian cấu hình và kiểm soát thiết bị</p></div>
        </div>
        <button ref={closeButtonRef} type="button" className="scanner-settings-close" onClick={onClose} aria-label="Đóng cài đặt"><X size={19} /></button>
      </header>
      <div className="settings-experience__intro">
        <span className="settings-experience__intro-kicker">SYSTEM PREFERENCES</span>
        <strong>Kiểm soát trải nghiệm vận hành</strong>
        <p>Các thiết lập hiện có được nhóm theo chức năng thực tế. Cấu hình được giữ nguyên theo cơ chế lưu trữ của từng hệ thống.</p>
      </div>
      <section className="settings-experience__group" aria-labelledby="settings-update-group">
        <div className="settings-experience__group-heading"><span id="settings-update-group">Cập nhật & thông báo</span><small>PHẦN MỀM</small></div>
        <button type="button" className={`settings-experience__item scanner-settings-menu-item--update ${updateEntry?.inCenter ? 'has-pending-update' : ''}`} onClick={() => setShowUpdateCenter(true)}>
          <span className="settings-experience__item-icon settings-experience__item-icon--update"><BellRing size={19} />{updateEntry?.inCenter && <i aria-label="Có bản cập nhật đang chờ" />}</span>
          <span className="scanner-settings-menu-copy"><strong>Trung tâm cập nhật</strong><small>{updateEntry?.inCenter ? `${updateEntry.title} · ${updateEntry.status === 'staged' ? 'Đã tải, chờ xác nhận' : updateEntry.status === 'deferred' ? 'Đã để sau' : updateEntry.status === 'downloading' ? 'Đang tải' : updateEntry.status === 'error' ? 'Cần xử lý' : 'Đang chờ xử lý'}` : 'Phiên bản, dung lượng tải và trạng thái kích hoạt'}</small></span>
          {updateEntry?.inCenter && <span className="scanner-settings-update-tag">ĐANG CHỜ</span>}
          <ChevronRight size={18} />
        </button>
      </section>
      <section className="settings-experience__group" aria-labelledby="settings-device-group">
        <div className="settings-experience__group-heading"><span id="settings-device-group">Thiết bị & ngoại vi</span><small>THIẾT BỊ</small></div>
        <button type="button" className="settings-experience__item" onClick={onOpenScannerSettings}>
          <span className="settings-experience__item-icon"><ScanBarcode size={19} /></span>
          <span className="scanner-settings-menu-copy"><strong>Cài đặt máy quét</strong><small>Âm báo, phản hồi rung và cấu hình nhận diện barcode</small></span>
          <ChevronRight size={18} />
        </button>
        <p className="settings-experience__note">Tùy chọn máy quét được lưu trên thiết bị và dùng chung cho Home, Kiểm kê cùng các chức năng Scanner.</p>
      </section>
      <footer className="settings-experience__footer"><span className="settings-experience__footer-dot" /> <span>RetailOS · Cấu hình hệ thống đang khả dụng</span></footer>
    </section>
  </div>;
}