import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clipboard, Download, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  clearScannerDiagnostics,
  exportScannerDiagnostics,
  getScannerDiagnosticSnapshot,
  installScannerDiagnosticCollector,
  subscribeScannerDiagnostics,
  type ScannerDiagnosticEvent,
} from '../../scanner/services/scannerDiagnosticCollector';

type Props = { onClose: () => void };

function downloadReport(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function metricNumber(event: ScannerDiagnosticEvent, key: string): number | null {
  const value = event.metrics[key];
  return typeof value === 'number' ? value : null;
}

export default function ScannerQaMonitor({ onClose }: Props) {
  const [events, setEvents] = useState(getScannerDiagnosticSnapshot());
  const [filter, setFilter] = useState<'all' | 'warn' | 'performance'>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const uninstall = installScannerDiagnosticCollector();
    const unsubscribe = subscribeScannerDiagnostics(() => setEvents([...getScannerDiagnosticSnapshot()]));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      uninstall();
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const filtered = useMemo(() => events.filter((event) => {
    if (filter === 'warn') return event.level === 'warn';
    if (filter === 'performance') return /Performance stage|Decoder processing cost|Runtime diagnostics|Multi-format diagnostics|UI commit|Camera focus|Camera settings|Video readiness|Camera track|Page lifecycle/.test(event.category);
    return true;
  }).slice().reverse(), [events]);

  const durations = events.flatMap((event) => {
    const value = metricNumber(event, 'durationMs');
    return value === null ? [] : [value];
  });
  const accepted = events.reduce((sum, event) => sum + (metricNumber(event, 'accepted') ?? 0), 0);
  const errors = events.filter((event) => event.level === 'warn' || /error/i.test(event.category)).length;
  const maxDuration = durations.length ? Math.max(...durations) : null;

  const exportJson = () => downloadReport(exportScannerDiagnostics(), `retailos-scanner-qa-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, 'application/json');
  const exportCsv = () => {
    const columns = ['timestamp', 'level', 'category', 'stage', 'durationMs', 'phase', 'decodeAttempts', 'accepted', 'rejectedByValidation', 'decodeDurationAverageMs', 'decodeDurationMaxMs', 'maxFrameCallbackGapMs', 'longTasks', 'layoutShiftScore','focusStatus','focusModes','focusRequestMs','videoReadyMs','videoReadyState','videoWidth','videoHeight','pageLifecycle','trackEvent','trackMuted','trackReadyState'];
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [columns.join(','), ...events.map((event) => columns.map((column) => quote(column === 'timestamp' ? event.timestamp : column === 'level' ? event.level : column === 'category' ? event.category : event.metrics[column])).join(','))];
    downloadReport(rows.join('\n'), `retailos-scanner-qa-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`, 'text/csv;charset=utf-8');
  };
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(exportScannerDiagnostics());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return <div className="scanner-qa-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="scanner-qa-panel" role="dialog" aria-modal="true" aria-labelledby="scanner-qa-title">
      <header className="scanner-qa-header">
        <div className="scanner-qa-heading-icon"><Activity size={20} /></div>
        <div><span className="scanner-qa-eyebrow">RETAILOS · DIAGNOSTICS</span><h2 id="scanner-qa-title">Scanner QA Monitor</h2><p>Theo dõi và xuất dữ liệu kiểm thử camera</p></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng QA Monitor"><X size={19} /></button>
      </header>

      <div className="scanner-qa-privacy"><ShieldCheck size={15} /><span>Chỉ lưu trong bộ nhớ phiên hiện tại. Không thu thập barcode, mã camera hoặc danh tính nhân viên.</span></div>

      <div className="scanner-qa-stats">
        <article><span>Sự kiện</span><strong>{events.length}</strong><small>/ 1.000 bản ghi</small></article>
        <article><span>Kết quả nhận</span><strong>{accepted}</strong><small>accepted events</small></article>
        <article><span>Cảnh báo</span><strong>{errors}</strong><small>warning / error</small></article>
        <article><span>Max stage</span><strong>{maxDuration === null ? '—' : `${maxDuration.toFixed(1)}`}</strong><small>milliseconds</small></article>
      </div>

      <div className="scanner-qa-toolbar">
        <div className="scanner-qa-filters" role="group" aria-label="Lọc sự kiện">
          <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Tất cả</button>
          <button className={filter === 'performance' ? 'is-active' : ''} onClick={() => setFilter('performance')}>Hiệu năng</button>
          <button className={filter === 'warn' ? 'is-active' : ''} onClick={() => setFilter('warn')}>Cảnh báo</button>
        </div>
        <button type="button" className="scanner-qa-clear" onClick={clearScannerDiagnostics}><Trash2 size={14} /> Xóa log</button>
      </div>

      <div className="scanner-qa-events" aria-live="polite">
        {filtered.length === 0 ? <div className="scanner-qa-empty"><Activity size={25} /><strong>Chưa có dữ liệu đo</strong><span>Mở máy quét và thực hiện thao tác để bắt đầu ghi nhận.</span></div>
          : filtered.map((event) => <article className="scanner-qa-event" key={event.id}>
            <div className={event.level === 'warn' ? 'scanner-qa-event-mark is-warn' : 'scanner-qa-event-mark'}>{event.level === 'warn' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}</div>
            <div className="scanner-qa-event-copy">
              <strong>{event.category}</strong>
              <time>{new Date(event.timestamp).toLocaleTimeString('vi-VN')}</time>
              <div className="scanner-qa-metrics">{Object.entries(event.metrics).filter(([key, value]) => value !== undefined && ['stage','durationMs','phase','phaseCommitIntervalMs','pageLifecycle','focusStatus','focusModes','focusRequestMs','width','height','frameRate','facingMode','focusMode','videoReadyMs','videoReadyState','videoWidth','videoHeight','trackEvent','trackMuted','trackReadyState','frameCallbackObserved','decodeAttempts','framesWithSymbols','accepted','rejectedByValidation','decoderErrors','decodeDurationAverageMs','decodeDurationMaxMs','maxFrameCallbackGapMs','longTasks','layoutShiftScore','averageDecodeMs','maxDecodeMs','samples'].includes(key)).slice(0, 7).map(([key, value]) => <span key={key}>{key}: <b>{typeof value === 'number' ? Number(value.toFixed(2)) : String(value)}</b></span>)}</div>
            </div>
          </article>)}
      </div>

      <footer className="scanner-qa-footer">
        <span><RefreshCw size={13} /> Live · tối đa 1.000 sự kiện gần nhất</span>
        <div>
          <button type="button" onClick={copyReport}><Clipboard size={15} />{copied ? 'Đã sao chép' : 'Copy JSON'}</button>
          <button type="button" onClick={exportCsv}><Download size={15} />CSV</button>
          <button type="button" className="scanner-qa-export" onClick={exportJson}><Download size={15} />Xuất JSON</button>
        </div>
      </footer>
    </section>
  </div>;
}
