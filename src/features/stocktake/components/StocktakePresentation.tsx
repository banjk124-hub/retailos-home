import {
  ArrowLeft, Camera, Check, ChevronRight, Clock3, Download, FileText, History, Plus,
  RefreshCw, ScanBarcode, Trash2, X,
} from 'lucide-react';
import type { EmployeeSession } from '../../../shared/domain/employee';
import type {
  StocktakeActionLog,
  StocktakeEntry,
  StocktakeExport,
  StocktakeSession,
  StocktakeZone,
} from '../types/stocktake.types';
import './stocktake.css';

export type StocktakeScreen = 'home' | 'scan' | 'review' | 'history' | 'exports';

export type StocktakePresentationModel = {
  employee: EmployeeSession;
  screen: StocktakeScreen;
  session: StocktakeSession | null;
  error: string;
  zoneInput: string;
  currentSessionExports: StocktakeExport[];
  visibleSessionZones: StocktakeZone[];
  currentSessionZones: StocktakeZone[];
  currentSessionLogs: StocktakeActionLog[];
  visibleHistoryLogs: StocktakeActionLog[];
  currentEntries: StocktakeEntry[];
  visibleReviewEntries: StocktakeEntry[];
  currentZone: StocktakeZone | null;
  barcode: string;
  quantity: string;
  editingEntry: string | null;
  scannerSupported: boolean;
  busy: boolean;
  pendingZone: { code: string; previous?: StocktakeZone } | null;
  showClearConfirm: boolean;
};

export type StocktakePresentationActions = {
  onClose: () => void;
  onBackHome: () => void;
  onZoneInputChange: (value: string) => void;
  onSubmitZone: () => void;
  onOpenHistory: () => void;
  onOpenExports: () => void;
  onResumeZone: (zone: StocktakeZone) => void;
  onRequestClear: () => void;
  onOpenScanner: (button: HTMLButtonElement) => void;
  onBarcodeChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSaveEntry: () => void;
  onOpenReview: () => void;
  onPauseZone: () => void;
  onEditEntry: (entry: StocktakeEntry, returnToScan?: boolean) => void;
  onEnterManualEntry: (returnToScan?: boolean) => void;
  onLoadMoreReview: () => void;
  onRemoveEntry: (entry: StocktakeEntry) => void;
  onExportCurrentZone: () => void;
  onBackToScan: () => void;
  onLoadMoreHistory: () => void;
  onDownloadPreviousExport: (item: StocktakeExport) => void;
  onCancelReplace: () => void;
  onConfirmReplace: () => void;
  onCancelClear: () => void;
  onConfirmClear: () => void;
};

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    SESSION_CREATED: 'Tạo phiên kiểm kê',
    ZONE_STARTED: 'Bắt đầu vùng',
    ZONE_REPLACED: 'Thay thế dữ liệu vùng',
    ZONE_RESUMED: 'Mở lại vùng',
    ZONE_PAUSED: 'Tạm dừng vùng',
    SCANNER_OPENED: 'Mở máy quét',
    ENTRY_SCANNED: 'Ghi nhận barcode',
    ENTRY_ADDED_MANUALLY: 'Thêm dòng thủ công',
    ENTRY_EDITED: 'Chỉnh sửa dòng',
    ENTRY_DELETED: 'Xóa dòng',
    ZONE_REVIEW_OPENED: 'Mở kiểm tra dữ liệu',
    ZONE_EXPORTED: 'Xuất file vùng',
  };
  return labels[action] ?? action;
}

function screenTitle(screen: StocktakeScreen): string {
  if (screen === 'history') return 'Lịch sử kiểm kê';
  if (screen === 'exports') return 'File đã xuất';
  if (screen === 'review') return 'Kiểm tra dữ liệu';
  if (screen === 'scan') return 'Quét hàng hóa';
  return 'Kiểm kê';
}

/** Renders Stocktake views and confirmation UI; workflow/state ownership stays in StocktakeModule. */
export default function StocktakePresentation({
  model,
  actions,
}: {
  model: StocktakePresentationModel;
  actions: StocktakePresentationActions;
}) {
  const {
    employee, screen, session, error, zoneInput, currentSessionExports, visibleSessionZones,
    currentSessionZones, currentSessionLogs, visibleHistoryLogs, currentEntries, visibleReviewEntries,
    currentZone, barcode, quantity, editingEntry, scannerSupported, busy, pendingZone, showClearConfirm,
  } = model;

  if (busy) {
    return (
      <div className="stocktake-backdrop" role="status" aria-live="polite" aria-busy="true">
        <section className="stocktake-panel stocktake-busy-panel">
          <span className="stocktake-busy-indicator" aria-hidden="true" />
          <p>Đang xử lý dữ liệu kiểm kê…</p>
        </section>
      </div>
    );
  }

  return (
    <div className="stocktake-backdrop" role="presentation">
      <section className="stocktake-panel" role="dialog" aria-modal="true" aria-labelledby="stocktake-title">
        <header className="stocktake-header">
          <button
            className="stocktake-icon-button"
            type="button"
            onClick={screen === 'home' ? actions.onClose : actions.onBackHome}
            aria-label={screen === 'home' ? 'Đóng kiểm kê' : 'Quay lại'}
          >
            {screen === 'home' ? <X size={20} /> : <ArrowLeft size={20} />}
          </button>
          <div>
            <span className="stocktake-eyebrow">RETAILOS · NGHIỆP VỤ</span>
            <h2 id="stocktake-title">{screenTitle(screen)}</h2>
          </div>
          <span className="stocktake-session-chip">{session?.employeeCode}</span>
        </header>

        {error && <p className="stocktake-error" role="alert">{error}</p>}

        {screen === 'home' && <>
          <div className="stocktake-employee">
            <span className="stocktake-avatar">{employee.name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span>
            <div><strong>{employee.name}</strong><small>{employee.department} · Phiên local</small></div>
          </div>
          <form className="stocktake-zone-form" onSubmit={(event) => { event.preventDefault(); actions.onSubmitZone(); }}>
            <label htmlFor="stocktake-zone">Mã vùng kiểm kê</label>
            <input
              id="stocktake-zone"
              value={zoneInput}
              onChange={(event) => actions.onZoneInputChange(event.target.value)}
              placeholder="Ví dụ: AT01"
              autoCapitalize="characters"
              autoComplete="off"
            />
            <small>Nhập tiền tố và số vùng, ví dụ AT01 → ADRESSE,AT,01.</small>
            <button className="stocktake-primary" type="submit"><ScanBarcode size={18} /> Bắt đầu vùng</button>
          </form>
          <div className="stocktake-shortcuts">
            <button type="button" disabled={busy} onClick={actions.onOpenHistory}>
              <History size={18} /><span>Lịch sử thao tác</span><ChevronRight size={16} />
            </button>
            <button type="button" onClick={actions.onOpenExports}>
              <FileText size={18} /><span>File đã xuất ({currentSessionExports.length})</span><ChevronRight size={16} />
            </button>
          </div>
          <div className="stocktake-zone-history">
            <div className="stocktake-section-title">Vùng trong phiên</div>
            {visibleSessionZones.map((zone) => (
              <button key={zone.id} type="button" disabled={busy} onClick={() => actions.onResumeZone(zone)}>
                <span><strong>{zone.zoneCode}</strong><small>Revision {zone.revision} · {localDate(zone.createdAt)}</small></span>
                <em>{zone.status === 'exported' ? 'Đã xuất' : 'Bản nháp'}</em>
                <ChevronRight size={16} />
              </button>
            ))}
            {currentSessionZones.length === 0 && <p className="stocktake-muted">Chưa có vùng kiểm kê.</p>}
          </div>
          <button className="stocktake-danger-link" type="button" disabled={!session} onClick={actions.onRequestClear}>
            <Trash2 size={15} /> Xóa toàn bộ dữ liệu kiểm kê trên thiết bị
          </button>
        </>}

        {screen === 'scan' && currentZone && <>
          <div className="stocktake-zone-banner">
            <div><small>VÙNG ĐANG KIỂM KÊ</small><strong>{currentZone.zoneCode}</strong></div>
            <span>REV {currentZone.revision}</span>
          </div>
          <div className="stocktake-count"><strong>{currentEntries.length}</strong><span>dòng đã ghi nhận</span></div>
          {scannerSupported && (
            <button className="stocktake-primary stocktake-scan-button" type="button" onClick={(event) => actions.onOpenScanner(event.currentTarget)}>
              <Camera size={18} /> Mở máy quét
            </button>
          )}
          <div className="stocktake-entry-form">
            <label htmlFor="stocktake-barcode">Barcode vừa quét / nhập thủ công</label>
            <input
              id="stocktake-barcode"
              inputMode="numeric"
              value={barcode}
              onChange={(event) => actions.onBarcodeChange(event.target.value)}
              placeholder="Quét mã hoặc nhập barcode"
            />
            <label htmlFor="stocktake-quantity">Số lượng</label>
            <input
              id="stocktake-quantity"
              type="number"
              min="0.001"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => actions.onQuantityChange(event.target.value)}
            />
            <button className="stocktake-primary" type="button" onClick={actions.onSaveEntry}>
              <Check size={17} /> {editingEntry ? 'Lưu chỉnh sửa' : 'Lưu số lượng'}
            </button>
          </div>
          <div className="stocktake-scan-actions">
            <button type="button" onClick={actions.onOpenReview}>Kiểm tra và xuất vùng <ChevronRight size={16} /></button>
            <button type="button" onClick={actions.onPauseZone}>Tạm dừng vùng</button>
          </div>
          {currentEntries.slice(-5).reverse().map((entry) => (
            <div className="stocktake-recent-entry" key={entry.id}>
              <span>{entry.barcode}</span><strong>× {entry.quantity}</strong>
              <button type="button" onClick={() => actions.onEditEntry(entry)} aria-label="Sửa dòng"><RefreshCw size={14} /></button>
            </div>
          ))}
          <button className="stocktake-secondary" type="button" onClick={() => actions.onEnterManualEntry()}>Nhập barcode thủ công</button>
        </>}

        {screen === 'review' && currentZone && <>
          <div className="stocktake-zone-banner">
            <div><small>DỮ LIỆU DỰ KIẾN XUẤT</small><strong>{currentZone.zoneCode}</strong></div>
            <span>{currentEntries.length} ARTICLE</span>
          </div>
          <div className="stocktake-review-note">Kiểm tra và chỉnh sửa từng dòng trước khi xuất. Barcode trùng nhau được giữ nguyên thành các dòng riêng.</div>
          {currentZone.status !== 'exported' && (
            <button className="stocktake-secondary" type="button" onClick={() => actions.onEnterManualEntry(true)}>
              <Plus size={16} /> Thêm dòng thủ công
            </button>
          )}
          <div className="stocktake-review-list">
            {visibleReviewEntries.map((entry) => (
              <div className="stocktake-review-row" key={entry.id}>
                <div><strong>{entry.barcode}</strong><small>Dòng {entry.sequence} · {entry.source === 'scan' ? 'Quét camera' : 'Nhập thủ công'}</small></div>
                <b>{entry.quantity}</b>
                {currentZone.status !== 'exported' && <>
                  <button type="button" onClick={() => actions.onEditEntry(entry, true)} aria-label="Sửa barcode hoặc số lượng"><RefreshCw size={15} /></button>
                  <button type="button" onClick={() => actions.onRemoveEntry(entry)} aria-label="Xóa dòng"><Trash2 size={15} /></button>
                </>}
              </div>
            ))}
            {currentEntries.length === 0 && <p className="stocktake-muted">Chưa có dòng ARTICLE.</p>}
            {currentEntries.length > visibleReviewEntries.length && <>
              <p className="stocktake-muted">Đang hiển thị {visibleReviewEntries.length} / {currentEntries.length} dòng.</p>
              <button className="stocktake-secondary" type="button" onClick={actions.onLoadMoreReview}>
                Xem thêm {Math.min(100, currentEntries.length - visibleReviewEntries.length)} dòng
              </button>
            </>}
          </div>
          <div className="stocktake-export-preview">
            <small>XEM TRƯỚC ĐỊNH DẠNG FILE</small>
            <code>
              NHAN VIEN,{session?.employeeCode},YYYY/MM/DD,HH:mm:ss<br />
              ADRESSE,{currentZone.prefix},{currentZone.number}<br />
              {currentEntries.slice(0, 3).map((entry) => `ARTICLE,${entry.barcode},${entry.quantity}`).join('\n')}{currentEntries.length > 3 ? '\n…' : ''}
            </code>
          </div>
          {currentZone.status === 'exported' ? (
            <p className="stocktake-review-note">Revision này đã xuất file và được khóa để bảo toàn dữ liệu. Muốn làm lại, nhập lại mã vùng tại màn hình chính để tạo revision mới.</p>
          ) : (
            <button
              className="stocktake-primary"
              type="button"
              disabled={currentEntries.length === 0}
              onClick={() => {
                if (window.confirm(`Xác nhận xuất ${currentZone.zoneCode} với ${currentEntries.length} dòng? File sẽ được tải về thiết bị.`)) {
                  actions.onExportCurrentZone();
                }
              }}
            >
              <Download size={18} /> Xác nhận xuất file
            </button>
          )}
          {currentZone.status !== 'exported' && (
            <button className="stocktake-secondary" type="button" onClick={actions.onBackToScan}>Quay lại quét / chỉnh sửa</button>
          )}
        </>}

        {screen === 'history' && <>
          <div className="stocktake-history-zones">
            <div className="stocktake-section-title">TẤT CẢ VÙNG VÀ PHIÊN BẢN</div>
            {currentSessionZones.map((zone) => (
              <article key={zone.id}>
                <span className="stocktake-history-icon"><FileText size={15} /></span>
                <div>
                  <strong>{zone.zoneCode} · Revision {zone.revision}</strong>
                  <p>{zone.status === 'superseded' ? 'Đã được thay thế' : zone.status === 'exported' ? 'Đã xuất · bản khóa' : 'Bản nháp'}</p>
                  <small>{localDate(zone.createdAt)}</small>
                </div>
              </article>
            ))}
            {currentSessionZones.length === 0 && <p className="stocktake-muted">Chưa có vùng kiểm kê.</p>}
          </div>
          <div className="stocktake-section-title stocktake-history-log-heading">NHẬT KÝ THAO TÁC</div>
          <div className="stocktake-history-list">
            {visibleHistoryLogs.map((log) => (
              <article key={log.id}>
                <span className="stocktake-history-icon"><Clock3 size={15} /></span>
                <div><strong>{actionLabel(log.action)}</strong><p>{log.details}</p><small>{localDate(log.timestamp)}</small></div>
              </article>
            ))}
            {currentSessionLogs.length === 0 && <p className="stocktake-muted">Chưa có lịch sử thao tác.</p>}
            {currentSessionLogs.length > visibleHistoryLogs.length && (
              <button className="stocktake-secondary" type="button" onClick={actions.onLoadMoreHistory}>
                Xem thêm {Math.min(100, currentSessionLogs.length - visibleHistoryLogs.length)} nhật ký
              </button>
            )}
          </div>
        </>}

        {screen === 'exports' && <div className="stocktake-history-list">
          {currentSessionExports.map((item) => (
            <article key={item.id}>
              <span className="stocktake-history-icon"><FileText size={15} /></span>
              <div><strong>{item.fileName}</strong><p>{item.zoneCode} · Revision {item.revision} · {item.entryCount} dòng</p><small>{localDate(item.exportedAt)}</small></div>
              <button type="button" onClick={() => actions.onDownloadPreviousExport(item)} aria-label="Tải lại file"><Download size={16} /></button>
            </article>
          ))}
          {currentSessionExports.length === 0 && <p className="stocktake-muted">Chưa có file xuất.</p>}
        </div>}

        <footer className="stocktake-footer">
          <span>Dữ liệu được lưu cục bộ trên thiết bị</span><span>RetailOS</span>
        </footer>
      </section>

      {pendingZone?.previous && (
        <div className="stocktake-confirm-backdrop">
          <section className="stocktake-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-replace-title">
            <h3 id="stocktake-replace-title">Vùng {pendingZone.code} đã tồn tại</h3>
            <p>Tiếp tục sẽ thay thế dữ liệu hiện hành của vùng này bằng một revision mới. Dữ liệu cũ vẫn được giữ trong lịch sử, không thể dùng làm dữ liệu hiện hành.</p>
            <div>
              <button type="button" className="stocktake-secondary" onClick={actions.onCancelReplace}>Hủy</button>
              <button type="button" className="stocktake-danger-button" onClick={actions.onConfirmReplace}>Xác nhận làm lại vùng</button>
            </div>
          </section>
        </div>
      )}

      {showClearConfirm && (
        <div className="stocktake-confirm-backdrop">
          <section className="stocktake-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-clear-title">
            <h3 id="stocktake-clear-title">Xóa toàn bộ dữ liệu kiểm kê?</h3>
            <p>Thao tác này xóa phiên, vùng, barcode, nhật ký và lịch sử file của riêng module Kiểm kê trên thiết bị. Không ảnh hưởng đăng nhập hoặc dữ liệu module khác.</p>
            <div>
              <button type="button" className="stocktake-secondary" onClick={actions.onCancelClear}>Giữ lại dữ liệu</button>
              <button type="button" className="stocktake-danger-button" onClick={actions.onConfirmClear}>Xóa dữ liệu</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
