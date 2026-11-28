import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, FileSpreadsheet, FileText,
  History, Info, LoaderCircle, Pencil, Save, Trash2, Upload, X,
} from 'lucide-react';
import type { RefObject } from 'react';
import type {
  ImportedStocktakeRow,
  StocktakeImportResult,
} from '../services/stocktakeImportParser';
import type { StocktakeImportHistoryItem } from '../services/stocktakeImportStore';
import './stocktake-import.css';

export type StocktakeImportView = 'import' | 'history';
export type StocktakeImportBusyAction = 'import' | 'save' | 'zip' | 'history' | null;
export type StocktakeImportZoneActionState = 'ready' | 'saved' | 'copied' | 'downloaded' | 'zipped' | 'dirty';

export type PendingImportReview = {
  incoming: StocktakeImportResult[];
  duplicateFiles: string[];
  sameNameDifferentContent: string[];
  zoneConflicts: Array<{ zoneCode: string; existingRows: number; incomingRows: number; duplicateWithinBatch: boolean }>;
};

export type StocktakeImportPresentationModel = {
  view: StocktakeImportView;
  result: StocktakeImportResult | null;
  history: StocktakeImportHistoryItem[];
  historyBusy: boolean;
  historyPersisted: boolean;
  historyExportingId: string | null;
  busy: boolean;
  busyAction: StocktakeImportBusyAction;
  error: string;
  notice: string;
  noticeTone: 'success' | 'warning' | 'info';
  showClearConfirm: boolean;
  showNewSessionConfirm: boolean;
  pendingImport: PendingImportReview | null;
  selectedZone: number;
  activeZone: StocktakeImportResult['zones'][number] | null;
  dirtyZones: string[];
  editingZone: boolean;
  page: number;
  pageCount: number;
  visibleRows: Array<{ row: ImportedStocktakeRow; issues: string[]; rowIndex: number }>;
  totalRows: number;
  totalUniqueProducts: number;
  activeZoneUniqueProducts: number;
  activeZoneHasProductNames: boolean;
  invalidCount: number;
  outputReady: boolean;
  canExportAll: boolean;
  zoneItems: Array<{
    zone: StocktakeImportResult['zones'][number];
    index: number;
    uniqueProductCount: number;
    actionState: StocktakeImportZoneActionState | 'invalid';
    actionLabel: string;
  }>;
  previewOpen: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  outputTextareaRef: RefObject<HTMLTextAreaElement>;
};

export type StocktakeImportPresentationActions = {
  onClose: () => void;
  onBackFromHistory: () => void;
  onOpenHistory: () => void;
  onSelectFile: () => void;
  onFilesSelected: (files: File[]) => void;
  onCancelPendingImport: () => void;
  onConfirmPendingImport: (mergeConflicts: boolean) => void;
  onRequestNewSession: () => void;
  onCancelNewSession: () => void;
  onResetActiveSession: () => void;
  onSelectZone: (index: number) => void;
  onOpenPreview: () => void;
  onClosePreview: () => void;
  onCopyOutput: () => void;
  onExportZone: (zoneIndex: number) => void;
  onExportAll: () => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveActiveZone: () => void;
  onUpdateRow: (rowIndex: number, field: 'barcode' | 'quantity', value: string) => void;
  onSetPage: (page: number) => void;
  onRequestClear: () => void;
  onCancelClear: () => void;
  onClearHistory: () => void;
  onRestoreHistoryItem: (item: StocktakeImportHistoryItem) => void;
  onDownloadHistoryZip: (item: StocktakeImportHistoryItem) => void;
};

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/** Renders Stocktake Import screens. Parsing, workflow state, persistence and export remain coordinator-owned. */
export default function StocktakeImportPresentation({
  model,
  actions,
}: {
  model: StocktakeImportPresentationModel;
  actions: StocktakeImportPresentationActions;
}) {
  const {
    view, result, history, historyBusy, historyPersisted, historyExportingId, busy, busyAction, error, notice,
    noticeTone, showClearConfirm, showNewSessionConfirm, pendingImport, selectedZone, activeZone, dirtyZones,
    editingZone, page, pageCount, visibleRows, totalRows, totalUniqueProducts, activeZoneUniqueProducts,
    activeZoneHasProductNames, invalidCount, outputReady, canExportAll, zoneItems, previewOpen,
    fileInputRef, outputTextareaRef,
  } = model;
  const hasDirtyZones = dirtyZones.length > 0;

  return (
    <div className="stocktake-import-backdrop stocktake-import-page" role="presentation">
      <section className="stocktake-import-panel" aria-labelledby="stocktake-import-title" aria-busy={busy}>
        <header className="stocktake-import-header">
          <button className="stocktake-import-icon-button" type="button" disabled={busy}
            onClick={view === 'history' ? actions.onBackFromHistory : actions.onClose}
            aria-label={view === 'history' ? 'Quay lại' : 'Về trang chủ'}>
            {view === 'history' ? <ArrowLeft size={20} /> : <X size={20} />}
          </button>
          <div>
            <span className="stocktake-import-eyebrow">RETAILOS · KIỂM KÊ</span>
            <h2 id="stocktake-import-title">{view === 'history' ? 'Lịch sử xuất file' : 'Xuất file'}</h2>
          </div>
          <button className="stocktake-import-icon-button" type="button" disabled={busy}
            onClick={actions.onOpenHistory} aria-label="Lịch sử"><History size={19} /></button>
        </header>

        <div className="stocktake-import-content">
          {error && <p className="stocktake-import-error" role="alert">{error}</p>}

          {view === 'import' && <>
            {pendingImport && <div className="stocktake-import-review-backdrop">
              <section className="stocktake-import-review-dialog" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-review-title">
                <h3 id="stocktake-import-review-title">Kiểm tra file bổ sung</h3>
                <p>Chưa có dữ liệu nào được cộng vào phiên hiện tại. Kiểm tra các mục dưới đây rồi xác nhận.</p>
                {pendingImport.duplicateFiles.length > 0 && <div className="stocktake-import-review-group">
                  <strong>File trùng nội dung · sẽ bỏ qua</strong>
                  {pendingImport.duplicateFiles.map((name, index) => <small key={name + index}>{name}</small>)}
                </div>}
                {pendingImport.sameNameDifferentContent.length > 0 && <div className="stocktake-import-review-group">
                  <strong>Cùng tên nhưng nội dung khác hoặc chưa đối chiếu được · cần xác nhận</strong>
                  {pendingImport.sameNameDifferentContent.map((name, index) => <small key={name + index}>{name}</small>)}
                </div>}
                {pendingImport.zoneConflicts.length > 0 && <div className="stocktake-import-review-group">
                  <strong>Vùng trùng · dữ liệu đang chờ xác nhận</strong>
                  {pendingImport.zoneConflicts.map((zone) => <small key={zone.zoneCode}>{zone.zoneCode}: phiên hiện tại {zone.existingRows} dòng · nguồn bổ sung {zone.incomingRows} dòng{zone.duplicateWithinBatch ? ' · xuất hiện ở nhiều file trong lượt này' : ''}</small>)}
                </div>}
                {busyAction === 'import' && <p className="stocktake-import-unsaved" role="status" aria-live="polite">Đang cập nhật phiên xử lý…</p>}
                <div className="stocktake-import-review-actions">
                  <button type="button" disabled={busy} onClick={actions.onCancelPendingImport}>Hủy bổ sung</button>
                  {pendingImport.zoneConflicts.length > 0
                    ? <>
                      <button type="button" disabled={busy} onClick={() => actions.onConfirmPendingImport(false)}>Bỏ qua vùng trùng</button>
                      <button type="button" disabled={busy} onClick={() => actions.onConfirmPendingImport(true)}>Gộp vùng trùng</button>
                    </>
                    : <button type="button" disabled={busy} onClick={() => actions.onConfirmPendingImport(true)}>Xác nhận tiếp tục</button>}
                </div>
              </section>
            </div>}
            {showNewSessionConfirm && <div className="stocktake-import-review-backdrop">
              <section className="stocktake-import-review-dialog" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-new-session-title">
                <h3 id="stocktake-import-new-session-title">Tạo phiên xử lý mới?</h3>
                <p>Phiên đang mở sẽ được đóng khỏi workspace. Lịch sử đã lưu vẫn được giữ nguyên và có thể khôi phục sau.</p>
                <div className="stocktake-import-review-actions">
                  <button type="button" disabled={busy} onClick={actions.onCancelNewSession}>Quay lại</button>
                  <button type="button" disabled={busy} onClick={actions.onResetActiveSession}>Tạo phiên mới</button>
                </div>
              </section>
            </div>}
            <div className="stocktake-import-intro">
              <div className="stocktake-import-symbol"><FileSpreadsheet size={23} /></div>
              <div><strong>Xử lý workbook ngay trên thiết bị</strong><p>Không tải file lên máy chủ. Có thể sử dụng khi offline.</p></div>
            </div>

            <input ref={fileInputRef} className="stocktake-import-file-input" type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              multiple
              onChange={(event) => actions.onFilesSelected(Array.from(event.target.files ?? []))} />
            <div className={'stocktake-import-import-actions' + (result ? ' has-session' : '')}>
              <button className="stocktake-import-primary stocktake-import-add-file" type="button" disabled={busy}
                onClick={actions.onSelectFile}>
                {busyAction === 'import' ? <LoaderCircle className="stocktake-import-spin" size={18} /> : <Upload size={18} />}
                {busyAction === 'import' ? 'Đang xử lý workbook…' : result ? 'Thêm file vào phiên' : 'Chọn file Excel'}
              </button>
              {result && <button className="stocktake-import-secondary stocktake-import-new-session" type="button" disabled={busy || hasDirtyZones}
                onClick={actions.onRequestNewSession}>Tạo phiên mới</button>}
            </div>
            <p className="stocktake-import-hint">Hỗ trợ chọn nhiều workbook .xlsx cùng lúc. Có thể thêm file vào phiên đang xử lý; dữ liệu chỉ được cộng dồn sau khi kiểm tra và xác nhận trùng file hoặc trùng vùng.</p>

            {result && <>
              <div className="stocktake-import-summary">
                <div className="is-source"><small>FILE NGUỒN</small><strong title={result.sourceFileName}>{result.sourceFileName}</strong></div>
                <div><small>SỐ VÙNG</small><strong>{result.zones.length}<small className="stocktake-import-metric-unit">vùng</small></strong></div>
                <div><small>TỔNG DÒNG</small><strong>{totalRows}<small className="stocktake-import-metric-unit">dòng</small></strong></div>
                <div><small>MÃ HÀNG</small><strong>{totalUniqueProducts}<small className="stocktake-import-metric-unit">mã duy nhất</small></strong></div>
              </div>
              {result.sourceFiles && result.sourceFiles.length > 1 && <details className="stocktake-import-source-list">
                <summary>{result.sourceFiles.length} file nguồn trong phiên</summary>
                {result.sourceFiles.map((source) => <small key={source.fingerprint}>{source.name} · {source.fingerprint.slice(0, 8)}</small>)}
              </details>}
              {result.blockingIssues.map((issue) => <p className="stocktake-import-error" role="alert" key={issue}>{issue}</p>)}
              {result.warnings.map((warning) => <p className="stocktake-import-warning" key={warning}>{warning}</p>)}

              <div className="stocktake-import-workspace">
                <aside className="stocktake-import-zone-nav" aria-label="Danh sách vùng">
                  <div className="stocktake-import-zone-nav-heading"><span>CÁC VÙNG</span>{result.zones.length > 1 && <button type="button" className="stocktake-import-zip-compact" disabled={!canExportAll} onClick={actions.onExportAll} title="Xuất tất cả vùng thành ZIP" aria-label="Xuất tất cả vùng thành ZIP">{busyAction === 'zip' ? <LoaderCircle className="stocktake-import-spin" size={13} /> : <Download size={13} />}<span>ZIP</span></button>}</div>
                  {zoneItems.map(({ zone, actionState, actionLabel, uniqueProductCount, index }) => (
                    <button key={zone.zoneCode} type="button" disabled={busy}
                      className={selectedZone === index ? 'is-active' : ''}
                      aria-current={selectedZone === index ? 'true' : undefined}
                      onClick={() => actions.onSelectZone(index)}>
                      <span><strong>{zone.zoneCode}</strong><small>{zone.rows.length} dòng · {uniqueProductCount} mã</small></span>
                      <em className={'is-' + actionState}>{actionLabel}</em>
                    </button>
                  ))}
                </aside>

                {activeZone && <section key={activeZone.zoneCode} className="stocktake-import-zone-workspace" aria-label={'Dữ liệu vùng ' + activeZone.zoneCode}>
                  {previewOpen ? <section className="stocktake-import-preview-screen" aria-label={'Xem trước TXT vùng ' + activeZone.zoneCode}>
                    <header className="stocktake-import-preview-screen-heading">
                      <button type="button" disabled={busy} onClick={actions.onClosePreview}><ArrowLeft size={16} /> Quay lại bảng</button>
                      <div><span className="stocktake-import-eyebrow">BẢN XUẤT TXT</span><strong>{activeZone.fileName}</strong><small>{activeZone.rows.length} dòng · {activeZoneUniqueProducts} mã hàng</small></div>
                      <span className="stocktake-import-state is-ready">Chỉ xem</span>
                    </header>
                    {outputReady
                      ? <textarea ref={outputTextareaRef} className="stocktake-import-output-textarea stocktake-import-preview-screen-text" aria-label={'Nội dung TXT ' + activeZone.zoneCode} value={activeZone.content} readOnly spellCheck={false} wrap="off"
                          onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); event.stopPropagation(); event.currentTarget.setSelectionRange(0, event.currentTarget.value.length); } }} />
                      : <div className="stocktake-import-output-unavailable">TXT chưa sẵn sàng. Hãy xử lý lỗi và lưu thay đổi trước khi xem hoặc xuất.</div>}
                  </section> : <>
                    <header className="stocktake-import-zone-heading">
                      <div><span className="stocktake-import-eyebrow">VÙNG KIỂM KÊ</span><h3>{activeZone.zoneCode}</h3>
                        <p>{activeZone.rows.length} dòng · {activeZoneUniqueProducts} mã hàng · {invalidCount} dòng cần xử lý</p></div>
                      <div className="stocktake-import-zone-actions">
                        {!editingZone
                          ? <>
                            <button type="button" className="stocktake-import-preview-trigger" disabled={busy} onClick={actions.onOpenPreview}><FileText size={15} /> Xem TXT</button>
                            <button type="button" disabled={busy || !outputReady} onClick={actions.onCopyOutput}><Copy size={15} /> Sao chép</button>
                            <button type="button" disabled={busy || !outputReady} onClick={() => actions.onExportZone(selectedZone)}><Download size={15} /> Tải TXT</button>
                            <button type="button" disabled={busy} onClick={actions.onBeginEdit}><Pencil size={15} /> Chỉnh sửa</button>
                          </>
                          : <>
                            <button type="button" disabled={busy} onClick={actions.onCancelEdit}><X size={15} /> Hủy</button>
                            <button type="button" className="is-save" disabled={busy || !dirtyZones.includes(activeZone.zoneCode)} onClick={actions.onSaveActiveZone}>
                              {busyAction === 'save' ? <LoaderCircle className="stocktake-import-spin" size={15} /> : <Save size={15} />} {busyAction === 'save' ? 'Đang lưu…' : 'Lưu thay đổi'}
                            </button>
                          </>}
                      </div>
                    </header>

                    {invalidCount > 0 && <p className="stocktake-import-warning">
                      Có {invalidCount} dòng cần bổ sung hoặc sửa. Hệ thống giữ nguyên dòng lỗi để người dùng xử lý, không tự ý loại bỏ.
                    </p>}
                    {dirtyZones.includes(activeZone.zoneCode) && <p className="stocktake-import-unsaved" role="status">Có thay đổi chưa lưu. Hãy lưu vùng trước khi xuất.</p>}

                    <div className="stocktake-import-editor-layer">
                      <div className="stocktake-import-table-toolbar">
                        <div>
                          <strong>{editingZone ? 'Đang chỉnh sửa dữ liệu' : 'Bảng dữ liệu kiểm kê'}</strong>
                          <span>{editingZone ? 'Thay đổi sẽ được lưu vào lịch sử trên thiết bị.' : 'Chọn Chỉnh sửa để cập nhật mã hàng hoặc kết quả thực tế.'}</span>
                        </div>
                        <span className={invalidCount ? 'stocktake-import-state is-invalid' : dirtyZones.includes(activeZone.zoneCode) || !historyPersisted ? 'stocktake-import-state is-dirty' : 'stocktake-import-state is-ready'}>
                          {invalidCount ? invalidCount + ' dòng lỗi' : dirtyZones.includes(activeZone.zoneCode) ? 'Chưa lưu thay đổi' : historyPersisted ? 'Đã lưu trên thiết bị' : 'Chưa lưu lịch sử'}
                        </span>
                      </div>
                      <div className="stocktake-import-table-wrap">
                        <table className={'stocktake-import-edit-table' + (activeZoneHasProductNames ? ' has-product-name' : '')}>
                          <thead><tr><th>DÒNG NGUỒN</th><th>BARCODE / GOLDCODE</th>{activeZoneHasProductNames && <th>TÊN SẢN PHẨM</th>}<th>KẾT QUẢ THỰC TẾ</th><th>NGUỒN MÃ</th><th>KIỂM TRA</th></tr></thead>
                          <tbody>
                            {visibleRows.map(({ row, issues, rowIndex }) => (
                              <tr key={(row.sourceFileName ?? '') + '-' + (row.sourceSheet ?? '') + '-' + row.sourceRow + '-' + rowIndex}
                                className={issues.length ? 'has-error' : ''}>
                                <td className="stocktake-import-source-row" title={[row.sourceFileName, row.sourceSheet].filter(Boolean).join(' · ')}>
                                  {row.sourceSheet ? row.sourceSheet + ' · ' + row.sourceRow : row.sourceRow}
                                  {result.sourceFiles && result.sourceFiles.length > 1 && row.sourceFileName && <small>{row.sourceFileName}{row.sourceFileId ? ' · ' + row.sourceFileId.slice(0, 8) : ''}</small>}
                                </td>
                                <td>{editingZone
                                  ? <input aria-label={'Mã hàng dòng ' + row.sourceRow} disabled={busy} value={row.barcode}
                                      onChange={(event) => actions.onUpdateRow(rowIndex, 'barcode', event.target.value)} />
                                  : <span className="stocktake-import-cell-value">{row.barcode || '—'}</span>}</td>
                                {activeZoneHasProductNames && <td><span className="stocktake-import-cell-value stocktake-import-product-name">{row.productName || '—'}</span></td>}
                                <td>{editingZone
                                  ? <input aria-label={'Kết quả thực tế dòng ' + row.sourceRow} disabled={busy} inputMode="decimal"
                                      value={row.quantity} onChange={(event) => actions.onUpdateRow(rowIndex, 'quantity', event.target.value)} />
                                  : <strong className="stocktake-import-cell-value">{row.quantity || '—'}</strong>}</td>
                                <td><span className="stocktake-import-source-tag">{row.barcodeSource}</span></td>
                                <td>{issues.length
                                  ? <span className="stocktake-import-row-error" title={issues.join(' ')}>{issues.join(' ')}</span>
                                  : <span className="stocktake-import-row-ok">Hợp lệ</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {activeZone.rows.length === 0 && <p className="stocktake-import-muted">Không có dòng dữ liệu.</p>}
                      </div>
                      {activeZone.rows.length > 100 && <div className="stocktake-import-pagination">
                        <span>{page * 100 + 1}–{Math.min((page + 1) * 100, activeZone.rows.length)} / {activeZone.rows.length} dòng</span>
                        <div>
                          <button type="button" disabled={busy || page === 0} onClick={() => actions.onSetPage(Math.max(0, page - 1))}><ChevronLeft size={16} /> Trước</button>
                          <strong>{page + 1}/{pageCount}</strong>
                          <button type="button" disabled={busy || page >= pageCount - 1} onClick={() => actions.onSetPage(Math.min(pageCount - 1, page + 1))}>Tiếp <ChevronRight size={16} /></button>
                        </div>
                      </div>}
                    </div>
                  </>}
                </section>}
              </div>
            </>}
          </>}

          {view === 'history' && <>
            <div className="stocktake-import-history-heading">
              <div><strong>Lịch sử xử lý trên thiết bị</strong><p>Giữ cả dữ liệu dòng và chỉnh sửa đã lưu để có thể tiếp tục làm việc.</p></div>
              <button type="button" disabled={busy || history.length === 0} onClick={actions.onRequestClear}><Trash2 size={15} /> Xóa</button>
            </div>
            {historyBusy ? <p className="stocktake-import-muted">Đang đọc lịch sử…</p> :
              history.length === 0 ? <p className="stocktake-import-muted">Chưa có lịch sử xuất file.</p> :
                <div className="stocktake-import-history-list">
                  {history.map((item) => <article key={item.id}>
                    <FileSpreadsheet size={19} />
                    <div><strong>{item.sourceFileName}</strong><p>{item.zoneCount} vùng · {item.rowCount} dòng</p><small>{localDate(item.importedAt)}</small></div>
                    <button type="button" disabled={busy || historyExportingId !== null} onClick={() => actions.onRestoreHistoryItem(item)}>Mở</button>
                    <button type="button" disabled={busy || historyExportingId !== null} onClick={() => actions.onDownloadHistoryZip(item)} aria-label="Tải lại kết quả">
                      {historyExportingId === item.id ? <LoaderCircle className="stocktake-import-spin" size={16} /> : <Download size={16} />}
                    </button>
                  </article>)}
                </div>}
          </>}

          <footer className="stocktake-import-footer"><span>Dữ liệu xử lý được lưu riêng với module Xuất file</span><span>RetailOS</span></footer>
        </div>
      </section>

      {notice && <div className={'stocktake-import-feedback is-' + noticeTone} role="status" aria-live="polite">
        <span className="stocktake-import-feedback-icon">
          {noticeTone === 'warning' ? <AlertTriangle size={22} /> : noticeTone === 'info' ? <Info size={22} /> : <CheckCircle2 size={22} />}
        </span>
        <strong>{notice}</strong>
      </div>}

      {showClearConfirm && <div className="stocktake-import-confirm-backdrop">
        <section className="stocktake-import-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-clear-title">
          <h3 id="stocktake-import-clear-title">Xóa lịch sử và bộ nhớ đệm?</h3>
          <p>Thao tác chỉ xóa lịch sử file kết quả của Xuất file trên thiết bị. Không ảnh hưởng dữ liệu, lịch sử hoặc file đã xuất của module Kiểm kê.</p>
          <div><button type="button" disabled={busy} onClick={actions.onCancelClear}>Giữ lại</button><button type="button" disabled={busy} onClick={actions.onClearHistory}>{busyAction === 'history' ? 'Đang xóa…' : 'Xóa lịch sử'}</button></div>
        </section>
      </div>}
    </div>
  );
}
