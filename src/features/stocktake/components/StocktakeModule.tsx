import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, Check, ChevronRight, Clock3, Download, FileText, History, Plus, RefreshCw, ScanBarcode, Trash2, X } from 'lucide-react';
import { lazy, Suspense } from 'react';

// Preload scanner code when the Home-owned Stocktake module is imported.
// The scanner remains visually lazy, but its runtime chunk is fetched early.
const stocktakeScannerModule = import('./StocktakeScanner');
const StocktakeScanner = lazy(() => stocktakeScannerModule);
import type { EmployeeSession } from '../../auth/types';
import { LOCAL_EMPLOYEE_DIRECTORY } from '../../auth/services/employeeDirectory';
import type { StocktakeEntry, StocktakeExport, StocktakeSession, StocktakeZone } from '../types/stocktake.types';
import { createStocktakeId, logStocktakeAction, stocktakeStore } from '../services/stocktakeLocalStore';
import { createStocktakeFile, downloadStocktakeText } from '../services/stocktakeExport';
import { unlockScannerAudio } from '../../scanner/services/scannerAudio';
import { isScannerSupportedDevice } from '../../scanner/services/scannerCapabilities';
import './stocktake.css';
import { AppErrorBoundary } from '../../../shared/components/AppErrorBoundary';

type Props = { employee: EmployeeSession; onClose: () => void };
type Screen = 'home' | 'scan' | 'review' | 'history' | 'exports';

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

export default function StocktakeModule({ employee, onClose }: Props) {
  const [session, setSession] = useState<StocktakeSession | null>(null);
  const [zones, setZones] = useState<StocktakeZone[]>([]);
  const [entries, setEntries] = useState<StocktakeEntry[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof stocktakeStore.getLogs>>>([]);
  const [exports, setExports] = useState<StocktakeExport[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [zoneInput, setZoneInput] = useState('');
  const [pendingZone, setPendingZone] = useState<{ code: string; prefix: string; number: string; previous?: StocktakeZone } | null>(null);
  const [currentZone, setCurrentZone] = useState<StocktakeZone | null>(null);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const resolvedEmployeeCode = employee.employeeCode.trim() || LOCAL_EMPLOYEE_DIRECTORY.find((record) => record.name === employee.name && record.departmentId === employee.departmentId && record.active !== false)?.employeeCode || '';

  const refresh = useCallback(async () => {
    const [allZones, allLogs, allExports] = await Promise.all([
      stocktakeStore.getZones(), stocktakeStore.getLogs(), stocktakeStore.getExports(),
    ]);
    setZones(allZones);
    setLogs(allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    setExports(allExports.sort((a, b) => b.exportedAt.localeCompare(a.exportedAt)));
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setBusy(true);
      setError('');
      try {
        if (!resolvedEmployeeCode) {
          throw new Error('Phiên đăng nhập hiện tại chưa có mã nhân viên. Vui lòng đăng xuất và đăng nhập lại để tạo phiên kiểm kê.');
        }
        const sessions = await stocktakeStore.getSessions();
        let current = sessions
          .filter((item) => item.employeeCode === resolvedEmployeeCode && item.status === 'active')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (!current) {
          current = {
            id: createStocktakeId('session'),
            employeeCode: resolvedEmployeeCode,
            employeeName: employee.name,
            department: employee.department,
            createdAt: new Date().toISOString(),
            status: 'active',
          };
          await stocktakeStore.putSession(current);
          await logStocktakeAction({ sessionId: current.id, action: 'SESSION_CREATED', details: 'Khởi tạo phiên kiểm kê.' });
        }
        if (!active) return;
        setSession(current);
        await refresh();
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể khởi tạo dữ liệu kiểm kê.');
      } finally {
        if (active) setBusy(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, [resolvedEmployeeCode, employee.name, employee.department, refresh]);

  const currentEntries = useMemo(
    () => entries.filter((entry) => entry.zoneId === currentZone?.id).sort((a, b) => a.sequence - b.sequence),
    [entries, currentZone],
  );

  const loadZoneEntries = async (zone: StocktakeZone) => {
    const allEntries = await stocktakeStore.getEntries();
    setEntries(allEntries.filter((entry) => entry.zoneId === zone.id).sort((a, b) => a.sequence - b.sequence));
  };

  const beginZone = async (replace: boolean, requested = pendingZone) => {
    if (!session || !requested) return;
    try {
      const previous = requested.previous;
      let revision = 1;
      if (previous) {
        revision = previous.revision + 1;
        await stocktakeStore.putZone({ ...previous, status: 'superseded', supersededAt: new Date().toISOString() });
      }
      const zone: StocktakeZone = {
        id: createStocktakeId('zone'),
        sessionId: session.id,
        zoneCode: requested.code,
        prefix: requested.prefix,
        number: requested.number,
        revision,
        status: 'draft',
        createdAt: new Date().toISOString(),
      };
      await stocktakeStore.putZone(zone);
      await logStocktakeAction({
        sessionId: session.id, zoneId: zone.id,
        action: previous && replace ? 'ZONE_REPLACED' : 'ZONE_STARTED',
        details: previous ? `Bắt đầu revision ${revision}, thay thế revision ${previous.revision} của ${zone.zoneCode}.` : `Bắt đầu vùng ${zone.zoneCode}.`,
      });
      setCurrentZone(zone);
      setEntries([]);
      setPendingZone(null);
      setZoneInput('');
      setScreen('scan');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo vùng kiểm kê.');
    }
  };

  const submitZone = async () => {
    setError('');
    const normalized = zoneInput.trim().toUpperCase();
    const match = normalized.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      setError('Mã vùng không hợp lệ. Ví dụ: AT01, AT02, AT08.');
      return;
    }
    if (!session) return;
    const previous = zones
      .filter((zone) => zone.sessionId === session.id && zone.zoneCode === normalized && zone.status !== 'superseded')
      .sort((a, b) => b.revision - a.revision)[0];
    const pending = { code: normalized, prefix: match[1], number: match[2], ...(previous ? { previous } : {}) };
    if (previous) {
      setPendingZone(pending);
      return;
    }
    setPendingZone(pending);
    await beginZone(false, pending);
  };

  const acceptBarcode = (value: string) => {
    setScannerOpen(false);
    setBarcode(value.trim());
    setQuantity('1');
    setManualEntry(false);
    setScreen('scan');
  };

  const saveEntry = async () => {
    if (!session || !currentZone) return;
    const normalizedBarcode = barcode.trim();
    const parsedQuantity = Number(quantity);
    if (!normalizedBarcode || /[\r\n,]/.test(normalizedBarcode)) {
      setError('Barcode không hợp lệ. Không để trống hoặc chứa dấu phẩy/xuống dòng.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Số lượng phải là số lớn hơn 0.');
      return;
    }
    try {
      if (editingEntry) {
        const old = currentEntries.find((item) => item.id === editingEntry);
        if (!old) return;
        const updated = { ...old, barcode: normalizedBarcode, quantity: parsedQuantity, editedAt: new Date().toISOString() };
        await stocktakeStore.putEntry(updated);
        await logStocktakeAction({
          sessionId: session.id, zoneId: currentZone.id, action: 'ENTRY_EDITED',
          details: `Sửa dòng ${old.sequence}: ${old.barcode} × ${old.quantity} → ${updated.barcode} × ${updated.quantity}.`,
        });
      } else {
        const all = await stocktakeStore.getEntries();
        const zoneEntries = all.filter((item) => item.zoneId === currentZone.id);
        const entry: StocktakeEntry = {
          id: createStocktakeId('entry'), zoneId: currentZone.id, barcode: normalizedBarcode,
          quantity: parsedQuantity, sequence: zoneEntries.reduce((max, item) => Math.max(max, item.sequence), 0) + 1,
          scannedAt: new Date().toISOString(), source: manualEntry ? 'manual' : 'scan',
        };
        await stocktakeStore.putEntry(entry);
        await logStocktakeAction({
          sessionId: session.id, zoneId: currentZone.id, action: manualEntry ? 'ENTRY_ADDED_MANUALLY' : 'ENTRY_SCANNED',
          details: `Ghi nhận ${entry.barcode} × ${entry.quantity} (dòng ${entry.sequence}).`,
        });
      }
      await loadZoneEntries(currentZone);
      setBarcode('');
      setQuantity('1');
      setEditingEntry(null);
      setManualEntry(false);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu dòng kiểm kê.');
    }
  };

  const editEntry = (entry: StocktakeEntry) => {
    setEditingEntry(entry.id);
    setBarcode(entry.barcode);
    setQuantity(String(entry.quantity));
    setManualEntry(true);
  };

  const removeEntry = async (entry: StocktakeEntry) => {
    if (!session || !window.confirm(`Xóa dòng ${entry.sequence} — ${entry.barcode}?`)) return;
    await stocktakeStore.deleteEntry(entry.id);
    await logStocktakeAction({
      sessionId: session.id, zoneId: entry.zoneId, action: 'ENTRY_DELETED',
      details: `Xóa dòng ${entry.sequence}: ${entry.barcode} × ${entry.quantity}.`,
    });
    if (currentZone) await loadZoneEntries(currentZone);
  };

  const openReview = async () => {
    if (!currentZone || !session) return;
    await loadZoneEntries(currentZone);
    await logStocktakeAction({ sessionId: session.id, zoneId: currentZone.id, action: 'ZONE_REVIEW_OPENED', details: `Mở kiểm tra dữ liệu vùng ${currentZone.zoneCode}, revision ${currentZone.revision}.` });
    await refresh();
    setScreen('review');
  };

  const exportCurrentZone = async () => {
    if (!session || !currentZone) return;
    if (currentEntries.length === 0) {
      setError('Vùng chưa có dữ liệu ARTICLE. Hãy quét hoặc thêm ít nhất một dòng.');
      return;
    }
    try {
      const exported = createStocktakeFile(session, currentZone, currentEntries);
      const record: StocktakeExport = {
        id: createStocktakeId('export'), sessionId: session.id, zoneId: currentZone.id,
        zoneCode: currentZone.zoneCode, revision: currentZone.revision, fileName: exported.fileName,
        exportedAt: exported.exportedAt, fileContent: exported.content, entryCount: currentEntries.length,
      };
      await stocktakeStore.putExport(record);
      await stocktakeStore.putZone({ ...currentZone, status: 'exported' });
      await logStocktakeAction({
        sessionId: session.id, zoneId: currentZone.id, action: 'ZONE_EXPORTED',
        details: `Xuất ${record.fileName}, ${record.entryCount} dòng, revision ${record.revision}.`,
      });
      downloadStocktakeText(record.fileName, record.fileContent);
      setCurrentZone({ ...currentZone, status: 'exported' });
      await refresh();
      setScreen('home');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xuất file kiểm kê.');
    }
  };

  const clearAll = async () => {
    if (!resolvedEmployeeCode) {
      setError('Không thể xóa hoặc tạo phiên kiểm kê khi chưa xác định được mã nhân viên.');
      setShowClearConfirm(false);
      return;
    }
    try {
      await stocktakeStore.clearAll();
      setScannerOpen(false);
      setSession(null);
      setCurrentZone(null);
      setEntries([]);
      setZones([]);
      setLogs([]);
      setExports([]);
      setShowClearConfirm(false);
      setScreen('home');
      setBusy(true);
      const fresh: StocktakeSession = {
        id: createStocktakeId('session'), employeeCode: resolvedEmployeeCode,
        employeeName: employee.name, department: employee.department,
        createdAt: new Date().toISOString(), status: 'active',
      };
      await stocktakeStore.putSession(fresh);
      await logStocktakeAction({ sessionId: fresh.id, action: 'SESSION_CREATED', details: 'Tạo phiên mới sau khi xóa dữ liệu kiểm kê.' });
      setSession(fresh);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa dữ liệu kiểm kê.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPreviousExport = (item: StocktakeExport) => downloadStocktakeText(item.fileName, item.fileContent);

  if (busy) return <div className="stocktake-backdrop"><section className="stocktake-panel"><p>Đang mở dữ liệu kiểm kê…</p></section></div>;

  return (
    <div className="stocktake-backdrop" role="presentation">
      <section className="stocktake-panel" role="dialog" aria-modal="true" aria-labelledby="stocktake-title">
        <header className="stocktake-header">
          <button className="stocktake-icon-button" type="button" onClick={screen === 'home' ? onClose : () => { setScreen('home'); setError(''); }} aria-label={screen === 'home' ? 'Đóng kiểm kê' : 'Quay lại'}>{screen === 'home' ? <X size={20} /> : <ArrowLeft size={20} />}</button>
          <div><span className="stocktake-eyebrow">RETAILOS · NGHIỆP VỤ</span><h2 id="stocktake-title">{screen === 'history' ? 'Lịch sử kiểm kê' : screen === 'exports' ? 'File đã xuất' : screen === 'review' ? 'Kiểm tra dữ liệu' : screen === 'scan' ? 'Quét hàng hóa' : 'Kiểm kê'}</h2></div>
          <span className="stocktake-session-chip">{session?.employeeCode}</span>
        </header>

        {error && <p className="stocktake-error" role="alert">{error}</p>}

        {screen === 'home' && <>
          <div className="stocktake-employee"><span className="stocktake-avatar">{employee.name.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span><div><strong>{employee.name}</strong><small>{employee.department} · Phiên local</small></div></div>
          <form className="stocktake-zone-form" onSubmit={(event) => { event.preventDefault(); void submitZone(); }}>
            <label htmlFor="stocktake-zone">Mã vùng kiểm kê</label>
            <input id="stocktake-zone" value={zoneInput} onChange={(event) => setZoneInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Ví dụ: AT01" autoCapitalize="characters" autoComplete="off" />
            <small>Nhập tiền tố và số vùng, ví dụ AT01 → ADRESSE,AT,01.</small>
            <button className="stocktake-primary" type="submit"><ScanBarcode size={18} /> Bắt đầu vùng</button>
          </form>
          <div className="stocktake-shortcuts">
            <button type="button" onClick={() => setScreen('history')}><History size={18} /><span>Lịch sử thao tác</span><ChevronRight size={16} /></button>
            <button type="button" onClick={() => setScreen('exports')}><FileText size={18} /><span>File đã xuất ({exports.filter((item) => item.sessionId === session?.id).length})</span><ChevronRight size={16} /></button>
          </div>
          <div className="stocktake-zone-history"><div className="stocktake-section-title">Vùng trong phiên</div>
            {zones.filter((zone) => zone.sessionId === session?.id && zone.status !== 'superseded').sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((zone) => <button key={zone.id} type="button" onClick={async () => { setCurrentZone(zone); await loadZoneEntries(zone); await logStocktakeAction({ sessionId: zone.sessionId, zoneId: zone.id, action: 'ZONE_RESUMED', details: `Mở lại vùng ${zone.zoneCode}, revision ${zone.revision}.` }); await refresh(); setScreen(zone.status === 'exported' ? 'review' : 'scan'); }}><span><strong>{zone.zoneCode}</strong><small>Revision {zone.revision} · {localDate(zone.createdAt)}</small></span><em>{zone.status === 'exported' ? 'Đã xuất' : 'Bản nháp'}</em><ChevronRight size={16} /></button>)}
            {zones.filter((zone) => zone.sessionId === session?.id).length === 0 && <p className="stocktake-muted">Chưa có vùng kiểm kê.</p>}
          </div>
          <button className="stocktake-danger-link" type="button" disabled={!session} onClick={() => setShowClearConfirm(true)}><Trash2 size={15} /> Xóa toàn bộ dữ liệu kiểm kê trên thiết bị</button>
        </>}

        {screen === 'scan' && currentZone && <>
          <div className="stocktake-zone-banner"><div><small>VÙNG ĐANG KIỂM KÊ</small><strong>{currentZone.zoneCode}</strong></div><span>REV {currentZone.revision}</span></div>
          <div className="stocktake-count"><strong>{currentEntries.length}</strong><span>dòng đã ghi nhận</span></div>
          {isScannerSupportedDevice() && <button className="stocktake-primary stocktake-scan-button" type="button" onClick={() => { void unlockScannerAudio(); setScannerOpen(true); if (session) void logStocktakeAction({ sessionId: session.id, zoneId: currentZone.id, action: 'SCANNER_OPENED', details: `Mở máy quét tại vùng ${currentZone.zoneCode}.` }); }}><Camera size={18} /> Mở máy quét</button>}
          <div className="stocktake-entry-form">
            <label htmlFor="stocktake-barcode">Barcode vừa quét / nhập thủ công</label>
            <input id="stocktake-barcode" inputMode="numeric" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Quét mã hoặc nhập barcode" />
            <label htmlFor="stocktake-quantity">Số lượng</label>
            <input id="stocktake-quantity" type="number" min="0.001" step="any" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <button className="stocktake-primary" type="button" onClick={() => { void saveEntry(); }}><Check size={17} /> {editingEntry ? 'Lưu chỉnh sửa' : 'Lưu số lượng'}</button>
          </div>
          <div className="stocktake-scan-actions"><button type="button" onClick={() => void openReview()}>Kiểm tra và xuất vùng <ChevronRight size={16} /></button><button type="button" onClick={() => { if (session) void logStocktakeAction({ sessionId: session.id, zoneId: currentZone.id, action: 'ZONE_PAUSED', details: `Tạm dừng vùng ${currentZone.zoneCode}.` }); setScreen('home'); setCurrentZone(null); }}>Tạm dừng vùng</button></div>
          {currentEntries.slice(-5).reverse().map((entry) => <div className="stocktake-recent-entry" key={entry.id}><span>{entry.barcode}</span><strong>× {entry.quantity}</strong><button type="button" onClick={() => editEntry(entry)} aria-label="Sửa dòng"><RefreshCw size={14} /></button></div>)}
          <button className="stocktake-secondary" type="button" onClick={() => { setManualEntry(true); setEditingEntry(null); setBarcode(''); setQuantity('1'); }}>Nhập barcode thủ công</button>
        </>}

        {screen === 'review' && currentZone && <>
          <div className="stocktake-zone-banner"><div><small>DỮ LIỆU DỰ KIẾN XUẤT</small><strong>{currentZone.zoneCode}</strong></div><span>{currentEntries.length} ARTICLE</span></div>
          <div className="stocktake-review-note">Kiểm tra và chỉnh sửa từng dòng trước khi xuất. Barcode trùng nhau được giữ nguyên thành các dòng riêng.</div>
          {currentZone.status !== 'exported' && <button className="stocktake-secondary" type="button" onClick={() => { setEditingEntry(null); setBarcode(''); setQuantity('1'); setManualEntry(true); setScreen('scan'); }}><Plus size={16} /> Thêm dòng thủ công</button>}
          <div className="stocktake-review-list">
            {currentEntries.map((entry) => <div className="stocktake-review-row" key={entry.id}><div><strong>{entry.barcode}</strong><small>Dòng {entry.sequence} · {entry.source === 'scan' ? 'Quét camera' : 'Nhập thủ công'}</small></div><b>{entry.quantity}</b>{currentZone.status !== 'exported' && <><button type="button" onClick={() => { editEntry(entry); setScreen('scan'); }} aria-label="Sửa barcode hoặc số lượng"><RefreshCw size={15} /></button><button type="button" onClick={() => void removeEntry(entry)} aria-label="Xóa dòng"><Trash2 size={15} /></button></>}</div>)}
            {currentEntries.length === 0 && <p className="stocktake-muted">Chưa có dòng ARTICLE.</p>}
          </div>
          <div className="stocktake-export-preview"><small>XEM TRƯỚC ĐỊNH DẠNG FILE</small><code>NHAN VIEN,{session?.employeeCode},YYYY/MM/DD,HH:mm:ss<br />ADRESSE,{currentZone.prefix},{currentZone.number}<br />{currentEntries.slice(0,3).map((entry) => `ARTICLE,${entry.barcode},${entry.quantity}`).join('\n')}{currentEntries.length > 3 ? '\n…' : ''}</code></div>
          {currentZone.status === 'exported' ? <p className="stocktake-review-note">Revision này đã xuất file và được khóa để bảo toàn dữ liệu. Muốn làm lại, nhập lại mã vùng tại màn hình chính để tạo revision mới.</p> : <button className="stocktake-primary" type="button" disabled={currentEntries.length === 0} onClick={() => { if (window.confirm(`Xác nhận xuất ${currentZone.zoneCode} với ${currentEntries.length} dòng? File sẽ được tải về thiết bị.`)) void exportCurrentZone(); }}><Download size={18} /> Xác nhận xuất file</button>}
          {currentZone.status !== 'exported' && <button className="stocktake-secondary" type="button" onClick={() => setScreen('scan')}>Quay lại quét / chỉnh sửa</button>}
        </>}

        {screen === 'history' && <>
          <div className="stocktake-history-zones"><div className="stocktake-section-title">TẤT CẢ VÙNG VÀ PHIÊN BẢN</div>
            {zones.filter((zone) => zone.sessionId === session?.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((zone) => <article key={zone.id}><span className="stocktake-history-icon"><FileText size={15} /></span><div><strong>{zone.zoneCode} · Revision {zone.revision}</strong><p>{zone.status === 'superseded' ? 'Đã được thay thế' : zone.status === 'exported' ? 'Đã xuất · bản khóa' : 'Bản nháp'}</p><small>{localDate(zone.createdAt)}</small></div></article>)}
            {zones.filter((zone) => zone.sessionId === session?.id).length === 0 && <p className="stocktake-muted">Chưa có vùng kiểm kê.</p>}
          </div>
          <div className="stocktake-section-title stocktake-history-log-heading">NHẬT KÝ THAO TÁC</div>
          <div className="stocktake-history-list">
            {logs.filter((log) => log.sessionId === session?.id).map((log) => <article key={log.id}><span className="stocktake-history-icon"><Clock3 size={15} /></span><div><strong>{actionLabel(log.action)}</strong><p>{log.details}</p><small>{localDate(log.timestamp)}</small></div></article>)}
            {logs.filter((log) => log.sessionId === session?.id).length === 0 && <p className="stocktake-muted">Chưa có lịch sử thao tác.</p>}
          </div>
        </>}

        {screen === 'exports' && <div className="stocktake-history-list">
          {exports.filter((item) => item.sessionId === session?.id).map((item) => <article key={item.id}><span className="stocktake-history-icon"><FileText size={15} /></span><div><strong>{item.fileName}</strong><p>{item.zoneCode} · Revision {item.revision} · {item.entryCount} dòng</p><small>{localDate(item.exportedAt)}</small></div><button type="button" onClick={() => downloadPreviousExport(item)} aria-label="Tải lại file"><Download size={16} /></button></article>)}
          {exports.filter((item) => item.sessionId === session?.id).length === 0 && <p className="stocktake-muted">Chưa có file xuất.</p>}
        </div>}

        <footer className="stocktake-footer"><span>Dữ liệu được lưu cục bộ trên thiết bị</span><span>RetailOS</span></footer>
      </section>

      {scannerOpen && screen === 'scan' && (
  <div className="stocktake-scanner-layer">
    <AppErrorBoundary fallback={<div className="stocktake-error" role="alert"><p>Không thể tải máy quét. Hãy đóng cửa sổ và thử lại.</p><button type="button" onClick={() => setScannerOpen(false)}>Đóng</button></div>}>
    <Suspense fallback={<div role="status">Đang tải máy quét...</div>}>
      <StocktakeScanner onDetected={acceptBarcode} onClose={() => setScannerOpen(false)} />
    </Suspense>
    </AppErrorBoundary>
  </div>
)}

      {pendingZone?.previous && <div className="stocktake-confirm-backdrop"><section className="stocktake-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-replace-title"><h3 id="stocktake-replace-title">Vùng {pendingZone.code} đã tồn tại</h3><p>Tiếp tục sẽ thay thế dữ liệu hiện hành của vùng này bằng một revision mới. Dữ liệu cũ vẫn được giữ trong lịch sử, không thể dùng làm dữ liệu hiện hành.</p><div><button type="button" className="stocktake-secondary" onClick={() => setPendingZone(null)}>Hủy</button><button type="button" className="stocktake-danger-button" onClick={() => void beginZone(true)}>Xác nhận làm lại vùng</button></div></section></div>}

      {showClearConfirm && <div className="stocktake-confirm-backdrop"><section className="stocktake-confirm" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-clear-title"><h3 id="stocktake-clear-title">Xóa toàn bộ dữ liệu kiểm kê?</h3><p>Thao tác này xóa phiên, vùng, barcode, nhật ký và lịch sử file của riêng module Kiểm kê trên thiết bị. Không ảnh hưởng đăng nhập hoặc dữ liệu module khác.</p><div><button type="button" className="stocktake-secondary" onClick={() => setShowClearConfirm(false)}>Giữ lại dữ liệu</button><button type="button" className="stocktake-danger-button" onClick={() => void clearAll()}>Xóa dữ liệu</button></div></section></div>}
    </div>
  );
}
