import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet,
  History, LoaderCircle, Pencil, Save, Trash2, Upload, X,
} from 'lucide-react';
import JSZip from 'jszip';
import type { EmployeeSession } from '../../auth/types';
import { LOCAL_EMPLOYEE_DIRECTORY } from '../../auth/services/employeeDirectory';
import {
  buildStocktakeOutput,
  buildZoneFileName,
  parseStocktakeWorkbook,
  type ImportedStocktakeRow,
  type StocktakeImportResult,
} from '../services/stocktakeImportParser';
import {
  stocktakeImportStore,
  type StocktakeImportHistoryItem,
} from '../services/stocktakeImportStore';
import './stocktake-import.css';

type Props = { employee: EmployeeSession; onClose: () => void };
type View = 'import' | 'history';
const PAGE_SIZE = 100;

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function validateRow(row: Pick<ImportedStocktakeRow, 'barcode' | 'quantity'>): string[] {
  const issues: string[] = [];
  const barcode = row.barcode.trim();
  const quantity = row.quantity.trim();
  if (!barcode) issues.push('Thiếu BARCODE/GOLDCODE.');
  else if (/[\r\n,]/.test(barcode)) issues.push('Mã hàng chứa dấu phẩy hoặc ký tự xuống dòng.');
  if (!quantity) issues.push('Thiếu kết quả thực tế.');
  else if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?%?$/.test(quantity)) {
    issues.push('Kết quả thực tế không phải số hợp lệ.');
  }
  return issues;
}

function normalizeEditableQuantity(value: string): string {
  const normalized = value.trim().replace(/\s/g, '');
  return /^[+-]?\d+,\d+(?:[eE][+-]?\d+)?%?$/.test(normalized) ? normalized.replace(',', '.') : value.trim();
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

function rowsFromLegacyContent(content: string): ImportedStocktakeRow[] {
  return content.split(/\r?\n/).filter((line) => line.startsWith('ARTICLE,')).map((line, index) => {
    const parts = line.slice('ARTICLE,'.length).split(',');
    const row = {
      barcode: parts[0] ?? '',
      quantity: parts.slice(1).join(','),
      sourceRow: index + 1,
      sourceSheet: undefined,
      barcodeSource: 'BARCODE' as const,
    };
    return { ...row, issues: validateRow(row) };
  });
}

export default function StocktakeImportModule({ employee, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('import');
  const [result, setResult] = useState<StocktakeImportResult | null>(null);
  const [historyId, setHistoryId] = useState<string | undefined>();
  const [selectedZone, setSelectedZone] = useState(0);
  const [history, setHistory] = useState<StocktakeImportHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingZone, setEditingZone] = useState(false);
  const [editBaseline, setEditBaseline] = useState<ImportedStocktakeRow[] | null>(null);
  const [dirtyZones, setDirtyZones] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const employeeCode = employee.employeeCode.trim() ||
    LOCAL_EMPLOYEE_DIRECTORY.find((record) =>
      record.name === employee.name && record.departmentId === employee.departmentId && record.active !== false,
    )?.employeeCode || '';
  const activeZone = result?.zones[selectedZone] ?? null;
  const totalRows = useMemo(
    () => result?.zones.reduce((total, zone) => total + zone.rows.length, 0) ?? 0,
    [result],
  );
  const invalidCount = activeZone?.rows.filter((row) => row.issues.length > 0).length ?? 0;
  const visibleRows = activeZone?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const pageCount = Math.max(1, Math.ceil((activeZone?.rows.length ?? 0) / PAGE_SIZE));
  const hasDirtyZones = dirtyZones.length > 0;
  const invalidZones = result?.zones.filter((zone) => zone.rows.some((row) => row.issues.length > 0)) ?? [];
  const canExportAll = Boolean(result && !hasDirtyZones && invalidZones.length === 0 && result.blockingIssues.length === 0 && !busy);

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
    setHistoryId(undefined);
    setDirtyZones([]);
    setEditingZone(false);
    setEditBaseline(null);
    setSelectedZone(0);
    setPage(0);
    setBusy(true);
    try {
      if (!employeeCode) throw new Error('Không xác định được mã nhân viên để tạo file theo định dạng Kiểm kê.');
      const parsed = await parseStocktakeWorkbook(file, employeeCode);
      setResult(parsed);
      setNotice('Đã đọc ' + parsed.zones.length + ' vùng, ' +
        parsed.zones.reduce((sum, zone) => sum + zone.rows.length, 0) + ' dòng. Hãy rà soát lỗi và lưu chỉnh sửa trước khi xuất.');
      try {
        const id = await stocktakeImportStore.saveResult(parsed);
        setHistoryId(id);
        await refreshHistory();
      } catch (storageError) {
        setNotice('Đã đọc file thành công nhưng không lưu được lịch sử trên thiết bị: ' +
          (storageError instanceof Error ? storageError.message : 'lỗi bộ nhớ cục bộ.'));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc file kiểm kê.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const selectZone = (index: number) => {
    if (editingZone && activeZone && dirtyZones.includes(activeZone.zoneCode)) {
      setNotice('Vùng hiện tại có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi chuyển vùng.');
      return;
    }
    setSelectedZone(index);
    setPage(0);
    setEditingZone(false);
    setEditBaseline(null);
    setError('');
  };

  const beginEdit = () => {
    if (!activeZone) return;
    setEditBaseline(activeZone.rows.map((row) => ({ ...row, issues: [...row.issues] })));
    setEditingZone(true);
    setNotice('Đang chỉnh sửa vùng ' + activeZone.zoneCode + '. Các thay đổi cần được lưu trước khi xuất.');
  };

  const updateRow = (rowIndex: number, field: 'barcode' | 'quantity', value: string) => {
    if (!result || !activeZone) return;
    const updatedZones = result.zones.map((zone, zoneIndex) => {
      if (zoneIndex !== selectedZone) return zone;
      const rows = zone.rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const updated = {
          ...row,
          [field]: value,
          barcodeSource: field === 'barcode' ? 'manual' as const : row.barcodeSource,
        };
        const retainedIssues = row.issues.filter((issue) => field === 'barcode'
          ? /kết quả|số lượng|diễn giải/i.test(issue)
          : /barcode|goldcode|mã hàng|mã vạch/i.test(issue));
        return { ...updated, issues: [...new Set([...validateRow(updated), ...retainedIssues])] };
      });
      return {
        ...zone,
        rows,
        content: buildStocktakeOutput(employeeCode, zone.zoneCode, rows.map((row) => ({ ...row, quantity: normalizeEditableQuantity(row.quantity) })), new Date(result.importedAt)),
      };
    });
    setResult({ ...result, zones: updatedZones });
    setDirtyZones((current) => current.includes(activeZone.zoneCode) ? current : [...current, activeZone.zoneCode]);
  };

  const cancelEdit = () => {
    if (!result || !activeZone || !editBaseline) {
      setEditingZone(false);
      return;
    }
    const zones = result.zones.map((zone, index) => index === selectedZone
      ? {
          ...zone,
          rows: editBaseline,
          content: buildStocktakeOutput(employeeCode, zone.zoneCode, editBaseline, new Date(result.importedAt)),
        }
      : zone);
    setResult({ ...result, zones });
    setDirtyZones((current) => current.filter((code) => code !== activeZone.zoneCode));
    setEditingZone(false);
    setEditBaseline(null);
    setNotice('Đã hủy các chỉnh sửa chưa lưu của vùng ' + activeZone.zoneCode + '.');
  };

  const saveActiveZone = async () => {
    if (!result || !activeZone) return;
    const normalizedRows = activeZone.rows.map((row) => {
      const quantity = normalizeEditableQuantity(row.quantity);
      const updated = { ...row, quantity };
      const retainedIssues = row.issues.filter((issue) =>
        issue.startsWith('Cột MÃ VẠCH') || issue.startsWith('Không thể diễn giải kết quả thực tế:'));
      return { ...updated, issues: [...new Set([...validateRow(updated), ...retainedIssues])] };
    });
    const invalid = normalizedRows.filter((row) => row.issues.length > 0 || validateRow(row).length > 0);
    if (invalid.length > 0) {
      setError('Vùng ' + activeZone.zoneCode + ' còn ' + invalid.length + ' dòng chưa hợp lệ. Hãy bổ sung mã hàng và kết quả thực tế.');
      return;
    }
    const updatedResult: StocktakeImportResult = {
      ...result,
      zones: result.zones.map((zone, index) => index === selectedZone
        ? { ...zone, rows: normalizedRows, content: buildStocktakeOutput(employeeCode, zone.zoneCode, normalizedRows, new Date(result.importedAt)) }
        : zone),
    };
    setBusy(true);
    setError('');
    try {
      const id = await stocktakeImportStore.saveResult(updatedResult, historyId);
      setResult(updatedResult);
      setHistoryId(id);
      setDirtyZones((current) => current.filter((code) => code !== activeZone.zoneCode));
      setEditingZone(false);
      setEditBaseline(null);
      setNotice('Đã lưu ' + activeZone.zoneCode + ' · ' + activeZone.rows.length + ' dòng. Có thể xuất vùng này.');
      await refreshHistory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu chỉnh sửa của vùng.');
    } finally {
      setBusy(false);
    }
  };

  const exportZone = (zoneIndex: number) => {
    if (!result) return;
    const zone = result.zones[zoneIndex];
    if (result.blockingIssues.length > 0) {
      setError('Workbook còn sheet chưa được nhận diện. Hãy xem hướng dẫn lỗi trước khi xuất để tránh bỏ sót dữ liệu.');
      return;
    }
    if (dirtyZones.includes(zone.zoneCode) || zone.rows.some((row) => row.issues.length > 0)) {
      setError('Vùng ' + zone.zoneCode + ' còn chỉnh sửa chưa lưu hoặc dữ liệu chưa hợp lệ.');
      return;
    }
    downloadText(zone.fileName, zone.content);
    setNotice('Đã xuất file vùng ' + zone.zoneCode + '.');
  };

  const exportAll = async () => {
    if (!result || result.zones.length === 0) return;
    if (hasDirtyZones || invalidZones.length > 0) {
      setError('Chưa thể xuất ZIP. Hãy xử lý lỗi và lưu chỉnh sửa cho tất cả vùng trước.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const zip = new JSZip();
      result.zones.forEach((zone) => zip.file(zone.fileName, zone.content));
      const blob = await zip.generateAsync({
        type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
      });
      downloadBlob('KIEM_KE_IMPORT.zip', blob);
      setNotice('Đã tạo ZIP gồm ' + result.zones.length + ' file TXT, mỗi file tương ứng một vùng.');
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
      setHistoryId(undefined);
      setDirtyZones([]);
      setEditingZone(false);
      setShowClearConfirm(false);
      setNotice('Đã xóa lịch sử và bộ nhớ đệm riêng của Nạp file kiểm kê.');
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
      warnings: item.warnings ?? [],
      blockingIssues: item.blockingIssues ?? [],
      zones: item.files.map((file) => {
        const match = file.zoneCode.match(/^([A-Z]*)(\d+)$/);
        const rows = file.rows?.map((row) => ({ ...row, issues: [...row.issues] })) ?? rowsFromLegacyContent(file.content);
        return {
          zoneCode: file.zoneCode,
          prefix: match?.[1] ?? '',
          number: match?.[2] ?? file.zoneCode,
          sheetName: file.zoneCode,
          rows,
          content: file.content,
          fileName: buildZoneFileName(file.zoneCode),
        };
      }),
    });
    setHistoryId(item.id);
    setDirtyZones([]);
    setEditingZone(false);
    setEditBaseline(null);
    setSelectedZone(0);
    setPage(0);
    setView('import');
    setNotice('Đã khôi phục bản dữ liệu đã lưu. Có thể tiếp tục rà soát hoặc tải lại kết quả.');
  };

  return (
    <div className="stocktake-import-backdrop" role="presentation" data-motion-state="enter">
      <section className="stocktake-import-panel" role="dialog" aria-modal="true"
        aria-labelledby="stocktake-import-title" aria-busy={busy}>
        <header className="stocktake-import-header">
          <button className="stocktake-import-icon-button" type="button"
            onClick={view === 'history' ? () => setView('import') : onClose}
            aria-label={view === 'history' ? 'Quay lại' : 'Đóng'}>
            {view === 'history' ? <ArrowLeft size={20} /> : <X size={20} />}
          </button>
          <div>
            <span className="stocktake-import-eyebrow">RETAILOS · KIỂM KÊ</span>
            <h2 id="stocktake-import-title">{view === 'history' ? 'Lịch sử nạp file' : 'Nạp file kiểm kê'}</h2>
          </div>
          <button className="stocktake-import-icon-button" type="button"
            onClick={() => { setView('history'); setError(''); }}
            aria-label="Lịch sử"><History size={19} /></button>
        </header>

        {error && <p className="stocktake-import-error" role="alert">{error}</p>}
        {notice && <p className="stocktake-import-notice" role="status"><CheckCircle2 size={16} />{notice}</p>}

        {view === 'import' && <>
          <div className="stocktake-import-intro">
            <div className="stocktake-import-symbol"><FileSpreadsheet size={23} /></div>
            <div><strong>Xử lý workbook ngay trên thiết bị</strong><p>Không tải file lên máy chủ. Có thể sử dụng khi offline.</p></div>
          </div>

          <input ref={inputRef} className="stocktake-import-file-input" type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void handleFile(event.target.files?.[0])} />
          <button className="stocktake-import-primary" type="button" disabled={busy}
            onClick={() => inputRef.current?.click()}>
            {busy ? <LoaderCircle className="stocktake-import-spin" size={18} /> : <Upload size={18} />}
            {busy ? 'Đang xử lý…' : 'Chọn file Excel'}
          </button>
          <p className="stocktake-import-hint">Hỗ trợ workbook .xlsx. Mỗi sheet được nhận diện độc lập; tên cột và thứ tự cột có thể khác nhau nếu mang cùng ý nghĩa.</p>

          {result && <>
            <div className="stocktake-import-summary">
              <div><small>FILE NGUỒN</small><strong>{result.sourceFileName}</strong></div>
              <div><small>SỐ VÙNG</small><strong>{result.zones.length}</strong></div>
              <div><small>TỔNG DÒNG</small><strong>{totalRows}</strong></div>
            </div>
            {result.blockingIssues.map((issue) => <p className="stocktake-import-error" role="alert" key={issue}>{issue}</p>)}
            {result.warnings.map((warning) => <p className="stocktake-import-warning" key={warning}>{warning}</p>)}

            <div className="stocktake-import-workspace">
              <aside className="stocktake-import-zone-nav" aria-label="Danh sách vùng">
                <div className="stocktake-import-zone-nav-heading">CÁC VÙNG</div>
                {result.zones.map((zone, index) => {
                  const rowErrors = zone.rows.filter((row) => row.issues.length > 0).length;
                  const isDirty = dirtyZones.includes(zone.zoneCode);
                  return <button key={zone.zoneCode} type="button"
                    className={selectedZone === index ? 'is-active' : ''}
                    aria-current={selectedZone === index ? 'true' : undefined}
                    onClick={() => selectZone(index)}>
                    <span><strong>{zone.zoneCode}</strong><small>{zone.rows.length} dòng</small></span>
                    <em className={rowErrors || isDirty ? 'has-issue' : 'is-ready'}>
                      {isDirty ? 'Chưa lưu' : rowErrors ? rowErrors + ' lỗi' : 'Sẵn sàng'}
                    </em>
                  </button>;
                })}
              </aside>

              {activeZone && <section className="stocktake-import-zone-workspace" aria-label={'Dữ liệu vùng ' + activeZone.zoneCode}>
                <header className="stocktake-import-zone-heading">
                  <div><span className="stocktake-import-eyebrow">VÙNG KIỂM KÊ</span><h3>{activeZone.zoneCode}</h3>
                    <p>{activeZone.rows.length} dòng · {invalidCount} dòng cần xử lý</p></div>
                  <div className="stocktake-import-zone-actions">
                    {!editingZone
                      ? <button type="button" onClick={beginEdit}><Pencil size={15} /> Chỉnh sửa</button>
                      : <>
                        <button type="button" disabled={busy} onClick={cancelEdit}><X size={15} /> Hủy</button>
                        <button type="button" className="is-save" disabled={busy} onClick={() => void saveActiveZone()}>
                          {busy ? <LoaderCircle className="stocktake-import-spin" size={15} /> : <Save size={15} />} Lưu vùng
                        </button>
                      </>}
                    <button type="button" disabled={editingZone || invalidCount > 0 || dirtyZones.includes(activeZone.zoneCode)}
                      onClick={() => exportZone(selectedZone)}><Download size={15} /> Xuất TXT</button>
                  </div>
                </header>

                {invalidCount > 0 && <p className="stocktake-import-warning">
                  Có {invalidCount} dòng cần bổ sung hoặc sửa. Hệ thống giữ nguyên dòng lỗi để người dùng xử lý, không tự ý loại bỏ.
                </p>}
                {dirtyZones.includes(activeZone.zoneCode) && <p className="stocktake-import-unsaved" role="status">Có thay đổi chưa lưu. Hãy lưu vùng trước khi xuất.</p>}

                <div className="stocktake-import-table-wrap">
                  <table className="stocktake-import-edit-table">
                    <thead><tr><th>DÒNG NGUỒN</th><th>BARCODE / GOLDCODE</th><th>KẾT QUẢ THỰC TẾ</th><th>NGUỒN MÃ</th><th>KIỂM TRA</th></tr></thead>
                    <tbody>
                      {visibleRows.map((row, visibleIndex) => {
                        const rowIndex = page * PAGE_SIZE + visibleIndex;
                        return <tr key={(row.sourceSheet ?? '') + '-' + row.sourceRow + '-' + rowIndex} className={row.issues.length ? 'has-error' : ''}>
                          <td className="stocktake-import-source-row">{row.sourceSheet ? row.sourceSheet + ' · ' + row.sourceRow : row.sourceRow}</td>
                          <td>{editingZone
                            ? <input aria-label={'Mã hàng dòng ' + row.sourceRow} value={row.barcode}
                                onChange={(event) => updateRow(rowIndex, 'barcode', event.target.value)} />
                            : <span className="stocktake-import-cell-value">{row.barcode || '—'}</span>}</td>
                          <td>{editingZone
                            ? <input aria-label={'Kết quả thực tế dòng ' + row.sourceRow} inputMode="decimal"
                                value={row.quantity} onChange={(event) => updateRow(rowIndex, 'quantity', event.target.value)} />
                            : <strong className="stocktake-import-cell-value">{row.quantity || '—'}</strong>}</td>
                          <td><span className="stocktake-import-source-tag">{row.barcodeSource}</span></td>
                          <td>{row.issues.length
                            ? <span className="stocktake-import-row-error" title={row.issues.join(' ')}>{row.issues.join(' ')}</span>
                            : <span className="stocktake-import-row-ok">Hợp lệ</span>}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                  {activeZone.rows.length === 0 && <p className="stocktake-import-muted">Không có dòng dữ liệu.</p>}
                </div>
                {activeZone.rows.length > PAGE_SIZE && <div className="stocktake-import-pagination">
                  <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, activeZone.rows.length)} / {activeZone.rows.length} dòng</span>
                  <div>
                    <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /> Trước</button>
                    <strong>{page + 1}/{pageCount}</strong>
                    <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Tiếp <ChevronRight size={16} /></button>
                  </div>
                </div>}

                <details className="stocktake-import-output-details">
                  <summary>Xem trước nội dung TXT</summary>
                  <div className="stocktake-import-output-preview"><pre>{activeZone.content}</pre></div>
                </details>
              </section>}
            </div>

            <div className="stocktake-import-export-footer">
              <div><strong>{result.blockingIssues.length ? 'Workbook còn sheet chưa hỗ trợ' : invalidZones.length ? invalidZones.length + ' vùng có lỗi' : hasDirtyZones ? 'Còn chỉnh sửa chưa lưu' : 'Tất cả vùng đã sẵn sàng'}</strong>
                <small>{result.blockingIssues.length ? 'Không xuất một phần workbook. Hãy đổi tên header theo hướng dẫn và nạp lại file.' : hasDirtyZones || invalidZones.length ? 'Cần xử lý và lưu từng vùng trước khi xuất ZIP.' : 'Mỗi vùng sẽ thành một file TXT riêng.'}</small></div>
              <button className="stocktake-import-primary stocktake-import-export" type="button"
                disabled={!canExportAll} onClick={() => void exportAll()}>
                <Download size={18} /> Xuất tất cả vùng thành ZIP
              </button>
            </div>
          </>}
        </>}

        {view === 'history' && <>
          <div className="stocktake-import-history-heading">
            <div><strong>Lịch sử xử lý trên thiết bị</strong><p>Giữ cả dữ liệu dòng và chỉnh sửa đã lưu để có thể tiếp tục làm việc.</p></div>
            <button type="button" disabled={busy || history.length === 0} onClick={() => setShowClearConfirm(true)}><Trash2 size={15} /> Xóa</button>
          </div>
          {historyBusy ? <p className="stocktake-import-muted">Đang đọc lịch sử…</p> :
            history.length === 0 ? <p className="stocktake-import-muted">Chưa có lịch sử nạp file.</p> :
              <div className="stocktake-import-history-list">
                {history.map((item) => <article key={item.id}>
                  <FileSpreadsheet size={19} />
                  <div><strong>{item.sourceFileName}</strong><p>{item.zoneCount} vùng · {item.rowCount} dòng</p><small>{localDate(item.importedAt)}</small></div>
                  <button type="button" onClick={() => restoreHistoryItem(item)}>Mở</button>
                  <button type="button" onClick={async () => {
                    const zip = new JSZip();
                    item.files.forEach((file) => zip.file(buildZoneFileName(file.zoneCode), file.content));
                    const blob = await zip.generateAsync({ type: 'blob' });
                    downloadBlob('KIEM_KE_IMPORT.zip', blob);
                  }} aria-label="Tải lại kết quả"><Download size={16} /></button>
                </article>)}
              </div>}
        </>}

        <footer className="stocktake-import-footer"><span>Dữ liệu xử lý được lưu riêng với module Nạp file kiểm kê</span><span>RetailOS</span></footer>
      </section>

      {showClearConfirm && <div className="stocktake-import-confirm-backdrop">
        <section className="stocktake-import-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-clear-title">
          <h3 id="stocktake-import-clear-title">Xóa lịch sử và bộ nhớ đệm?</h3>
          <p>Thao tác chỉ xóa lịch sử file kết quả của Nạp file kiểm kê trên thiết bị. Không ảnh hưởng dữ liệu, lịch sử hoặc file đã xuất của module Kiểm kê.</p>
          <div><button type="button" onClick={() => setShowClearConfirm(false)}>Giữ lại</button><button type="button" onClick={() => void clearHistory()}>Xóa lịch sử</button></div>
        </section>
      </div>}
    </div>
  );
}
