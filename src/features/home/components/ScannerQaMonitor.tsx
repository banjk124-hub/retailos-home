import { memo, useEffect, useMemo, useState } from 'react';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import { downloadFile } from '../../../shared/downloadFile';
import { Activity, AlertTriangle, CheckCircle2, Clipboard, Download, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  clearScannerDiagnostics,
  exportScannerDiagnostics,
  getScannerDiagnosticSnapshot,
  installScannerDiagnosticCollector,
  subscribeScannerDiagnostics,
  type ScannerDiagnosticEvent,
} from '../../scanner/services/scannerDiagnosticCollector';
import '../../../styles/scanner-qa-monitor.css';

type Props = { onClose: () => void };

function downloadReport(content: string, filename: string, type: string): void {
  downloadFile(new Blob([content], { type }), filename);
}

function metricNumber(event: ScannerDiagnosticEvent, key: string): number | null {
  const value = event.metrics[key];
  return typeof value === 'number' ? value : null;
}

function adaptivePlan(event: ScannerDiagnosticEvent): Record<string, unknown> | null {
  const value = event.metrics.adaptiveProcessingPlan;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function metricValue(event: ScannerDiagnosticEvent, key: string): unknown {
  const plan = adaptivePlan(event);
  if (key === 'adaptiveMode') return plan?.mode;
  if (key === 'adaptiveTransforms') return Array.isArray(plan?.imageTransforms)
    ? plan.imageTransforms.join('|') : plan?.imageTransforms === null ? 'legacy' : '';
  if (key === 'adaptiveReasons') return Array.isArray(plan?.reasons) ? plan.reasons.join('|') : '';
  return event.metrics[key];
}

const VISIBLE_METRIC_KEYS = new Set([
  'stage', 'durationMs', 'phase', 'phaseCommitIntervalMs', 'pageLifecycle',
  'focusStatus', 'focusModes', 'focusRequestMs', 'focusSharpness', 'focusSharpnessMin',
  'focusEdgeCoverage', 'focusMotionScore', 'focusQualitySamples', 'focusSustainedBlurEvents',
  'focusQualityStatus', 'cameraControlChanged', 'width', 'height', 'frameRate', 'facingMode',
  'focusMode', 'videoReadyMs', 'videoReadyState', 'videoWidth', 'videoHeight', 'trackEvent',
  'trackMuted', 'trackReadyState', 'frameCallbackObserved', 'decodeAttempts',
  'framesWithSymbols', 'accepted', 'rejectedByValidation', 'decoderErrors',
  'decodeDurationAverageMs', 'decodeDurationMaxMs', 'maxFrameCallbackGapMs', 'longTasks',
  'layoutShiftScore', 'averageDecodeMs', 'maxDecodeMs', 'samples', 'roiUnavailable',
  'roiWidth', 'roiHeight', 'roiSourceScale', 'rotationAttempts', 'rotationHits',
  'deskewAttempts', 'deskewEstimateMisses', 'deskewHits', 'scaleAttempts', 'scaleHits',
  'lastScaleFactor', 'lastDeskewAngleDegrees', 'adaptiveRuntimeMode',
  'adaptiveRuntimeImageBudget', 'adaptiveRuntimeGeometryBudget', 'adaptiveRuntimeTransitions',
  'adaptiveRuntimeDecodeMs', 'adaptiveRuntimeFrameGapMs', 'adaptiveRuntimeReason',
]);

const ScannerQaEventRow = memo(function ScannerQaEventRow({ event }: { event: ScannerDiagnosticEvent }) {
  const plan = adaptivePlan(event);
  const visibleMetrics = Object.entries(event.metrics)
    .filter(([key, value]) => value !== undefined && VISIBLE_METRIC_KEYS.has(key))
    .slice(0, 12);

  return <article className="scanner-qa-event">
    <div className={event.level === 'warn' ? 'scanner-qa-event-mark is-warn' : 'scanner-qa-event-mark'}>{event.level === 'warn' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}</div>
    <div className="scanner-qa-event-copy">
      <strong>{event.category}</strong>
      <time>{new Date(event.timestamp).toLocaleTimeString('vi-VN')}</time>
      {typeof event.metrics.adaptiveRuntimeMode === 'string' && <div className="scanner-qa-metrics scanner-qa-adaptive-plan">
        <span>A3 runtime: <b>{String(event.metrics.adaptiveRuntimeMode)}</b></span>
        <span>Image budget: <b>{String(event.metrics.adaptiveRuntimeImageBudget ?? '—')}</b></span>
        <span>Geometry budget: <b>{String(event.metrics.adaptiveRuntimeGeometryBudget ?? '—')}</b></span>
        <span>Transitions: <b>{String(event.metrics.adaptiveRuntimeTransitions ?? 0)}</b></span>
        <span>Reason: <b>{String(event.metrics.adaptiveRuntimeReason ?? '—')}</b></span>
        <span>Decode: <b>{String(event.metrics.adaptiveRuntimeDecodeMs ?? '—')} ms</b></span>
        <span>Frame gap: <b>{String(event.metrics.adaptiveRuntimeFrameGapMs ?? '—')} ms</b></span>
      </div>}
      {plan && <div className="scanner-qa-metrics scanner-qa-adaptive-plan">
        <span>A2 mode: <b>{String(plan.mode ?? '—')}</b></span>
        <span>Transforms: <b>{Array.isArray(plan.imageTransforms) ? (plan.imageTransforms as string[]).join(', ') || 'none' : 'legacy policy'}</b></span>
        <span>Reasons: <b>{Array.isArray(plan.reasons) ? (plan.reasons as string[]).join(', ') : '—'}</b></span>
      </div>}
      <div className="scanner-qa-metrics">{visibleMetrics.map(([key, value]) => <span key={key}>{key}: <b>{typeof value === 'number' ? Number(value.toFixed(2)) : String(value)}</b></span>)}</div>
    </div>
  </article>;
});

export default function ScannerQaMonitor({ onClose }: Props) {
  useBodyScrollLock(true);
  const [events, setEvents] = useState(getScannerDiagnosticSnapshot());
  const [filter, setFilter] = useState<'all' | 'warn' | 'performance'>('all');
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  useEffect(() => {
    const uninstall = installScannerDiagnosticCollector();
    const unsubscribe = subscribeScannerDiagnostics(() => setEvents([...getScannerDiagnosticSnapshot()]));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      uninstall();
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const filtered = useMemo(() => events.filter((event) => {
    if (filter === 'warn') return event.level === 'warn';
    if (filter === 'performance') return /Performance stage|Decoder processing cost|Runtime diagnostics|Multi-format diagnostics|Adaptive runtime policy|UI commit|Camera focus|Camera settings|Video readiness|Camera track|Page lifecycle/.test(event.category);
    return true;
  }).slice().reverse(), [events]);

  const { accepted, errors, maxDuration } = useMemo(() => {
    const durations: number[] = [];
    let acceptedCount = 0;
    let errorCount = 0;
    for (const event of events) {
      const duration = metricNumber(event, 'durationMs');
      if (duration !== null) durations.push(duration);
      acceptedCount += metricNumber(event, 'accepted') ?? 0;
      if (event.level === 'warn' || /error/i.test(event.category)) errorCount += 1;
    }
    return {
      accepted: acceptedCount,
      errors: errorCount,
      maxDuration: durations.length ? Math.max(...durations) : null,
    };
  }, [events]);

  const exportJson = () => downloadReport(exportScannerDiagnostics(), `retailos-scanner-qa-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, 'application/json');
  const exportCsv = () => {
    const columns = ['timestamp', 'level', 'category', 'stage', 'durationMs', 'phase', 'decodeAttempts', 'accepted', 'rejectedByValidation', 'decodeDurationAverageMs', 'decodeDurationMaxMs', 'maxFrameCallbackGapMs', 'longTasks', 'layoutShiftScore','focusStatus','focusModes','focusRequestMs','focusSharpness','focusSharpnessMin','focusEdgeCoverage','focusMotionScore','focusQualitySamples','focusSustainedBlurEvents','focusQualityStatus','cameraControlChanged','videoReadyMs','videoReadyState','videoWidth','videoHeight','pageLifecycle','trackEvent','trackMuted','trackReadyState','roiUnavailable','roiWidth','roiHeight','roiSourceScale','rotationAttempts','rotationHits','deskewAttempts','deskewEstimateMisses','deskewHits','scaleAttempts','scaleHits','lastScaleFactor','lastDeskewAngleDegrees','adaptiveMode','adaptiveTransforms','adaptiveReasons','adaptiveRuntimeMode','adaptiveRuntimeImageBudget','adaptiveRuntimeGeometryBudget','adaptiveRuntimeTransitions','adaptiveRuntimeDecodeMs','adaptiveRuntimeFrameGapMs','adaptiveRuntimeReason'];
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [columns.join(','), ...events.map((event) => columns.map((column) => quote(column === 'timestamp' ? event.timestamp : column === 'level' ? event.level : column === 'category' ? event.category : metricValue(event, column))).join(','))];
    downloadReport(rows.join('\n'), `retailos-scanner-qa-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`, 'text/csv;charset=utf-8');
  };
  const copyReport = async () => {
    if (copyState === 'copying') return;
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(exportScannerDiagnostics());
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('idle');
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
          : filtered.map((event) => <ScannerQaEventRow key={event.id} event={event} />)}
      </div>

      <footer className="scanner-qa-footer">
        <span><RefreshCw size={13} /> Live · tối đa 1.000 sự kiện gần nhất</span>
        <div>
          <button type="button" disabled={copyState === 'copying'} aria-busy={copyState === 'copying'} onClick={copyReport}><Clipboard size={15} />{copyState === 'copying' ? 'Đang sao chép…' : copyState === 'copied' ? 'Đã sao chép' : 'Copy JSON'}</button>
          <button type="button" onClick={exportCsv}><Download size={15} />CSV</button>
          <button type="button" className="scanner-qa-export" onClick={exportJson}><Download size={15} />Xuất JSON</button>
        </div>
      </footer>
    </section>
  </div>;
}
