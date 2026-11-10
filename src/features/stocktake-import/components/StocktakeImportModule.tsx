import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, History, LoaderCircle, Trash2, Upload, X } from 'lucide-react';
import JSZip from 'jszip';
import type { EmployeeSession } from '../../auth/types';
import {
  parseStocktakeWorkbook,
  type StocktakeImportResult,
} from '../services/stocktakeImportParser';
import {
  stocktakeImportStore,
  type StocktakeImportHistoryItem,
} from '../services/stocktakeImportStore';
import './stocktake-import.css';

type Props = { employee: EmployeeSession; onClose: () => void };
type View = 'import' | 'history';

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadText(fileName: string, content: string): void {
  downloadBlob(fileName, new Blob([content], { type: 'text/plain;charset=utf-8' }));
}

export default function StocktakeImportModule({ employee, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('import');
  const [result, setResult] = useState<StocktakeImportResult | null>(null);
  const [selectedZone, setSelectedZone] = useState(0);
  const [history, setHistory] = useState<StocktakeImportHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const employeeCode = employee.employeeCode.trim();
  const activeZone = result?.zones[selectedZone] ?? null;
  const totalRows = useMemo(() => result?.zones.reduce((total, zone) => total + zone.rows.length, 0) ?? 0, [result]);

  const refreshHistory = async () => {
    setHistoryBusy(true);
    try {
      setHistory(await stocktakeImportStore.getHistory());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc lịch sử xử lý.');
    } finally {
      setHistoryBusy(false);
    }
  };

  useEffect(() => { void refreshHistory(); }, []);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setNotice('');
    setResult(null);
    setSelectedZone(0);
    setBusy(true);
    try {
      if (!employeeCode) throw new Error('Không xác định được mã nhân viên để tạo file theo định dạng Kiểm kê.');
      const parsed = await parseStocktakeWorkbook(file, employeeCode);
      setResult(parsed);
      setNotice(`Đã phân tích ${parsed.zones.length} vùng với ${parsed.zones.reduce((sum, zone) => sum + zone.rows.length, 0)} dòng dữ liệu.`);
      try {
        await stocktakeImportStore.saveResult(parsed);
        await refreshHistory();
      } catch (storageError) {
        setNotice('Đã phân tích và tạo preview thành công, nhưng không thể lưu lịch sử trên thiết bị: ' + (storageError instanceof Error ? storageError.message : 'lỗi bộ nhớ cục bộ.'));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc file kiểm kê.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const exportAll = async () => {
    if (!result || result.zones.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const zip = new JSZip();
      result.zones.forEach((zone) => zip.file(zone.fileName, zone.content));
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const stamp = new Date(result.importedAt);
      const date = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`;
      downloadBlob(`KIEM_KE_IMPORT_${date}.zip`, blob);
      setNotice(`Đã tạo gói ZIP gồm ${result.zones.length} file TXT riêng theo từng vùng.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đóng gói file kết quả.');
    } finally {
      setBusy(false);
    }
  };

  const clearHistory = async () => {
    setBusy(true);
    setError('');
    try {
      await stocktakeImportStore.clearHistory();
      setHistory([]);
      setResult(null);
      setShowClearConfirm(false);
      setNotice('Đã xóa lịch sử và bộ nhớ đệm của Nạp file kiểm kê.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa lịch sử.');
    } finally {
      setBusy(false);
    }
  };

  const restoreHistoryItem = (item: StocktakeImportHistoryItem) => {
    setResult({
      sourceFileName: item.sourceFileName,
      importedAt: item.importedAt,
      warnings: [],
      zones: item.files.map((file) => {
        const match = file.zoneCode.match(/^([A-Z]*)(\d+)$/);
        const rows = file.content.split(/\r?\n/).filter((line) => line.startsWith('ARTICLE,'))
          .map((line, index) => {
            const parts = line.split(',');
            return { barcode: parts[1] ?? '', quantity: parts.slice(2).join(','), sourceRow: index + 1 };
          });
        return {
          zoneCode: file.zoneCode, prefix: match?.[1] ?? '', number: match?.[2] ?? file.zoneCode,
          sheetName: file.zoneCode, rows, content: file.content, fileName: file.fileName,
        };
      }),
    });
    setSelectedZone(0);
    setView('import');
    setNotice('Đã khôi phục các file kết quả đã lưu trong lịch sử. Dữ liệu đầu vào gốc không được lưu.');
  };

  return (
    <div className="stocktake-import-backdrop" role="presentation">
      <section className="stocktake-import-panel" role="dialog" aria-modal="true" aria-labelledby="stocktake-import-title">
        <header className="stocktake-import-header">
          <button className="stocktake-import-icon-button" type="button" onClick={view === 'history' ? () => setView('import') : onClose} aria-label={view === 'history' ? 'Quay lại' : 'Đóng'}>
            {view === 'history' ? <ArrowLeft size={20} /> : <X size={20} />}
          </button>
          <div>
            <span className="stocktake-import-eyebrow">RETAILOS · KIỂM KÊ</span>
            <h2 id="stocktake-import-title">{view === 'history' ? 'Lịch sử nạp file' : 'Nạp file kiểm kê'}</h2>
          </div>
          <button className="stocktake-import-icon-button" type="button" onClick={() => { setView('history'); setError(''); }} aria-label="Lịch sử">
            <History size={19} />
          </button>
        </header>

        {error && <p className="stocktake-import-error" role="alert">{error}</p>}
        {notice && <p className="stocktake-import-notice" role="status"><CheckCircle2 size={16} />{notice}</p>}

        {view === 'import' && <>
          <div className="stocktake-import-intro">
            <div className="stocktake-import-symbol"><FileSpreadsheet size={23} /></div>
            <div><strong>Xử lý workbook ngay trên thiết bị</strong><p>Không tải file lên máy chủ. Có thể sử dụng khi offline.</p></div>
          </div>

          <input ref={inputRef} className="stocktake-import-file-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0])} />
          <button className="stocktake-import-primary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <LoaderCircle className="stocktake-import-spin" size={18} /> : <Upload size={18} />}
            {busy ? 'Đang xử lý…' : 'Chọn file Excel'}
          </button>
          <p className="stocktake-import-hint">Hỗ trợ workbook .xlsx có một hoặc nhiều sheet. Mỗi sheet vùng được xuất thành một file riêng.</p>

          {result && <>
            <div className="stocktake-import-summary">
              <div><small>FILE NGUỒN</small><strong>{result.sourceFileName}</strong></div>
              <div><small>SỐ VÙNG</small><strong>{result.zones.length}</strong></div>
              <div><small>TỔNG DÒNG</small><strong>{totalRows}</strong></div>
            </div>
            {result.warnings.map((warning) => <p className="stocktake-import-warning" key={warning}>{warning}</p>)}
            <div className="stocktake-import-zone-tabs" role="tablist" aria-label="Các vùng trong file">
              {result.zones.map((zone, index) => <button key={zone.zoneCode} type="button" role="tab" aria-selected={selectedZone === index} className={selectedZone === index ? 'is-active' : ''} onClick={() => setSelectedZone(index)}>
                <strong>{zone.zoneCode}</strong><small>{zone.rows.length} dòng</small>
              </button>)}
            </div>
            {activeZone && <>
              <div className="stocktake-import-preview-head"><div><small>PREVIEW OUTPUT</small><strong>{activeZone.fileName}</strong></div><button type="button" onClick={() => downloadText(activeZone.fileName, activeZone.content)}><Download size={15} /> Tải vùng này</button></div>
              <div className="stocktake-import-output-preview"><pre>{activeZone.content}</pre></div>
              {activeZone.rows.length > 0 && <div className="stocktake-import-data-preview">
                <div className="stocktake-import-table-head"><span>BARCODE</span><span>SỐ LƯỢNG</span><span>DÒNG NGUỒN</span></div>
                {activeZone.rows.slice(0, 80).map((row) => <div className="stocktake-import-table-row" key={row.sourceRow}><span>{row.barcode}</span><strong>{row.quantity}</strong><small>{row.sourceRow}</small></div>)}
                {activeZone.rows.length > 80 && <p>Đang hiển thị 80/{activeZone.rows.length} dòng. File xuất vẫn bao gồm toàn bộ dữ liệu.</p>}
              </div>}
            </>}
            <button className="stocktake-import-primary stocktake-import-export" type="button" disabled={busy} onClick={() => void exportAll()}><Download size={18} /> Xuất tất cả vùng thành ZIP</button>
          </>}
        </>}

        {view === 'history' && <>
          <div className="stocktake-import-history-heading"><div><strong>Lịch sử xử lý trên thiết bị</strong><p>File kết quả được lưu cục bộ để xem lại hoặc tải lại.</p></div><button type="button" disabled={busy || history.length === 0} onClick={() => setShowClearConfirm(true)}><Trash2 size={15} /> Xóa</button></div>
          {historyBusy ? <p className="stocktake-import-muted">Đang đọc lịch sử…</p> : history.length === 0 ? <p className="stocktake-import-muted">Chưa có lịch sử nạp file.</p> : <div className="stocktake-import-history-list">
            {history.map((item) => <article key={item.id}>
              <FileSpreadsheet size={19} />
              <div><strong>{item.sourceFileName}</strong><p>{item.zoneCount} vùng · {item.rowCount} dòng</p><small>{localDate(item.importedAt)}</small></div>
              <button type="button" onClick={() => restoreHistoryItem(item)}>Xem</button>
              <button type="button" onClick={async () => { const zip = new JSZip(); item.files.forEach((file) => zip.file(file.fileName, file.content)); const blob = await zip.generateAsync({ type: 'blob' }); downloadBlob(`KIEM_KE_IMPORT_${item.id}.zip`, blob); }} aria-label="Tải lại kết quả"><Download size={16} /></button>
            </article>)}
          </div>}
        </>}

        <footer className="stocktake-import-footer"><span>Dữ liệu xử lý được lưu riêng với module Kiểm kê</span><span>RetailOS</span></footer>
      </section>

      {showClearConfirm && <div className="stocktake-import-confirm-backdrop"><section className="stocktake-import-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-clear-title">
        <h3 id="stocktake-import-clear-title">Xóa lịch sử và bộ nhớ đệm?</h3>
        <p>Thao tác chỉ xóa lịch sử file kết quả của Nạp file kiểm kê trên thiết bị. Không ảnh hưởng dữ liệu, lịch sử hoặc file đã xuất của module Kiểm kê.</p>
        <div><button type="button" onClick={() => setShowClearConfirm(false)}>Giữ lại</button><button type="button" onClick={() => void clearHistory()}>Xóa lịch sử</button></div>
      </section></div>}
    </div>
  );
}
