import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, FileSpreadsheet, Info,
  FileText, History, LoaderCircle, Pencil, Save, Trash2, Upload, X,
} from 'lucide-react';
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
  countUniqueProductCodes,
  detectStocktakeImportConflicts,
  mergeStocktakeImportSession,
  type ImportReviewMeta,
  type ZoneConflict,
} from '../services/stocktakeImportSession';
import {
  stocktakeImportStore,
  type StocktakeImportHistoryItem,
} from '../services/stocktakeImportStore';
import './stocktake-import.css';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';

type Props = { employee: EmployeeSession; onClose: () => void };
type View = 'import' | 'history';
type ZoneActionState = 'ready' | 'saved' | 'copied' | 'downloaded' | 'zipped' | 'dirty';
type PendingImportReview = {
  incoming: StocktakeImportResult[];
  duplicateFiles: string[];
  sameNameDifferentContent: string[];
  zoneConflicts: ZoneConflict[];
};
const PAGE_SIZE = 100;

function yieldToNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function createZipArchive() {
  const JSZip = (await import('jszip')).default;
  return new JSZip();
}

function localDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function validateRow(row: Pick<ImportedStocktakeRow, 'barcode' | 'quantity'>): string[] {
  const issues: string[] = [];
  const barcode = row.barcode.trim();
  const quantity = row.quantity.trim();
  if (!barcode) issues.push('Thiếu BARCODE/CODE/GOLDCODE/TILLCODE.');
  else if (/[\r\n,]/.test(barcode)) issues.push('Mã hàng chứa dấu phẩy hoặc ký tự xuống dòng.');
  if (!quantity) issues.push('Thiếu kết quả thực tế.');
  else if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?%?$/.test(quantity)) {
    issues.push('Kết quả thực tế không phải số hợp lệ.');
  }
  return issues;
}

function getRowIssues(row: ImportedStocktakeRow): string[] {
  return [...new Set([...(row.issues ?? []), ...validateRow(row)])];
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
      productName: '',
      quantity: parts.slice(1).join(','),
      sourceRow: index + 1,
      sourceSheet: undefined,
      barcodeSource: 'BARCODE' as const,
    };
    return { ...row, issues: validateRow(row) };
  });
}

export default function StocktakeImportModule({ employee, onClose }: Props) {
  useBodyScrollLock(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<View>('import');
  const [result, setResult] = useState<StocktakeImportResult | null>(null);
  const [historyId, setHistoryId] = useState<string | undefined>();
  const [selectedZone, setSelectedZone] = useState(0);
  const [history, setHistory] = useState<StocktakeImportHistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<'import' | 'save' | 'zip' | 'history' | null>(null);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [historyPersisted, setHistoryPersisted] = useState(false);
  const [historyExportingId, setHistoryExportingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImportReview | null>(null);
  const [editingZone, setEditingZone] = useState(false);
  const [editBaseline, setEditBaseline] = useState<ImportedStocktakeRow[] | null>(null);
  const [dirtyZones, setDirtyZones] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoneActionStates, setZoneActionStates] = useState<Record<string, ZoneActionState>>({});

  const employeeCode = employee.employeeCode.trim() ||
    LOCAL_EMPLOYEE_DIRECTORY.find((record) =>
      record.name === employee.name && record.departmentId === employee.departmentId && record.active !== false,
    )?.employeeCode || '';
  const activeZone = result?.zones[selectedZone] ?? null;
  const totalRows = useMemo(
    () => result?.zones.reduce((total, zone) => total + zone.rows.length, 0) ?? 0,
    [result],
  );
  const totalUniqueProducts = useMemo(
    () => countUniqueProductCodes(result?.zones.flatMap((zone) => zone.rows) ?? []),
    [result],
  );
  const activeZoneUniqueProducts = useMemo(
    () => countUniqueProductCodes(activeZone?.rows ?? []),
    [activeZone],
  );
  const activeZoneHasProductNames = useMemo(
    () => Boolean(activeZone?.rows.some((row) => row.productName?.trim())),
    [activeZone],
  );
  const invalidCount = useMemo(
    () => activeZone?.rows.reduce((count, row) => count + (getRowIssues(row).length > 0 ? 1 : 0), 0) ?? 0,
    [activeZone],
  );
  const outputReady = Boolean(activeZone && result && invalidCount === 0 &&
    !editingZone && !dirtyZones.includes(activeZone.zoneCode) && result.blockingIssues.length === 0);
  const visibleRows = activeZone?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const pageCount = Math.max(1, Math.ceil((activeZone?.rows.length ?? 0) / PAGE_SIZE));
  const hasDirtyZones = dirtyZones.length > 0;
  const noticeTone = /không|chưa|lỗi|cần xác nhận|cần bổ sung|bị bỏ qua|không được/i.test(notice)
    ? 'warning'
    : /đang|khôi phục|phiên mới/i.test(notice) ? 'info' : 'success';
  const invalidZones = useMemo(
    () => result?.zones.filter((zone) => zone.rows.some((row) => getRowIssues(row).length > 0)) ?? [],
    [result],
  );
  const canExportAll = Boolean(result && !hasDirtyZones && invalidZones.length === 0 && result.blockingIssues.length === 0 && !busy && !editingZone);

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

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const commitIncoming = async (
    incoming: StocktakeImportResult[],
    mergeConflicts: boolean,
    reviewMeta: ImportReviewMeta = { duplicateFiles: [], sameNameDifferentContent: [] },
  ) => {
    if (incoming.length === 0) return;
    const nextResult = mergeStocktakeImportSession(result, incoming, employeeCode, mergeConflicts, reviewMeta);
    const preservedZoneCode = activeZone?.zoneCode;
    setResult(nextResult);
    setHistoryPersisted(false);
    setSelectedZone(Math.max(0, nextResult.zones.findIndex((zone) => zone.zoneCode === preservedZoneCode)));
    setEditingZone(false);
    setEditBaseline(null);
    setDirtyZones([]);
    setZoneActionStates(Object.fromEntries(nextResult.zones.map((zone) => [zone.zoneCode, 'ready'])));
    setPreviewOpen(false);
    setPage(0);
    try {
      const id = await stocktakeImportStore.saveResult(nextResult, historyId);
      setHistoryId(id);
      setHistoryPersisted(true);
      await refreshHistory();
      setNotice('Đã cập nhật phiên xử lý với ' + incoming.length + ' file nguồn. ' +
        nextResult.zones.length + ' vùng · ' +
        nextResult.zones.reduce((sum, zone) => sum + zone.rows.length, 0) + ' dòng.');
    } catch (storageError) {
      setNotice('Đã cập nhật dữ liệu trong phiên hiện tại nhưng không lưu được lịch sử trên thiết bị: ' +
        (storageError instanceof Error ? storageError.message : 'lỗi bộ nhớ cục bộ.'));
    }
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (hasDirtyZones) {
      setNotice('Phiên hiện tại có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy trước khi thêm file.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError('');
    setNotice('');
    setBusy(true);
    setBusyAction('import');
    try {
      if (!employeeCode) throw new Error('Không xác định được mã nhân viên để tạo file theo định dạng Kiểm kê.');
      const knownSources = result?.sourceFiles ?? [];
      const knownFingerprints = new Map(knownSources.map((source) => [source.fingerprint, source.name]));
      const knownNames = new Map(knownSources.map((source) => [source.name, source.fingerprint]));
      if (result && knownSources.length === 0) knownNames.set(result.sourceFileName, 'legacy-unknown');
      const incoming: StocktakeImportResult[] = [];
      const duplicateFiles: string[] = [];
      const sameNameDifferentContent: string[] = [];
      const batchFingerprints = new Map<string, string>();
      for (const file of files) {
        const parsed = await parseStocktakeWorkbook(file, employeeCode, result ? new Date(result.importedAt) : new Date());
        const source = parsed.sourceFiles?.[0];
        if (!source) throw new Error('Không tạo được định danh cho file ' + file.name + '.');
        const knownDuplicateName = knownFingerprints.get(source.fingerprint);
        const batchDuplicateName = batchFingerprints.get(source.fingerprint);
        if (knownDuplicateName || batchDuplicateName) {
          duplicateFiles.push(file.name + ' (trùng nội dung với ' + (knownDuplicateName ?? batchDuplicateName) + ')');
          continue;
        }
        batchFingerprints.set(source.fingerprint, file.name);
        const sameNameFingerprint = knownNames.get(file.name);
        if (sameNameFingerprint && sameNameFingerprint !== source.fingerprint) sameNameDifferentContent.push(file.name + ' (SHA ' + source.fingerprint.slice(0, 8) + ')');
        knownNames.set(file.name, source.fingerprint);
        parsed.zones.forEach((zone) => zone.rows.forEach((row) => { row.sourceFileName = file.name; }));
        incoming.push(parsed);
      }
      const zoneConflicts = detectStocktakeImportConflicts(result, incoming);
      const pending: PendingImportReview = { incoming, duplicateFiles, sameNameDifferentContent, zoneConflicts };
      if (duplicateFiles.length || sameNameDifferentContent.length || zoneConflicts.length) {
        setPendingImport(pending);
        setNotice('Đã phân tích file bổ sung. Phiên hiện tại chưa bị thay đổi; cần xác nhận các điểm trùng trước khi tiếp tục.');
      } else {
        await commitIncoming(incoming, true, { duplicateFiles, sameNameDifferentContent });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đọc file kiểm kê.');
    } finally {
      setBusy(false);
      setBusyAction(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmPendingImport = async (mergeConflicts: boolean) => {
    if (!pendingImport) return;
    const pending = pendingImport;
    setBusy(true);
    setBusyAction('import');
    setError('');
    try {
      await yieldToNextPaint();
      if (pending.incoming.length) await commitIncoming(pending.incoming, mergeConflicts, {
        duplicateFiles: pending.duplicateFiles,
        sameNameDifferentContent: pending.sameNameDifferentContent,
      });
      else setNotice('File trùng đã được bỏ qua. Phiên hiện tại không thay đổi.');
      setPendingImport(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xác nhận dữ liệu bổ sung.');
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  };

  const resetActiveSession = () => {
    setResult(null);
    setHistoryPersisted(false);
    setHistoryId(undefined);
    setSelectedZone(0);
    setEditingZone(false);
    setEditBaseline(null);
    setDirtyZones([]);
    setZoneActionStates({});
    setPreviewOpen(false);
    setPage(0);
    setPendingImport(null);
    setShowNewSessionConfirm(false);
    setError('');
    setNotice('Đã tạo phiên mới. Dữ liệu lịch sử trước đó vẫn được giữ lại.');
  };

  const selectZone = (index: number) => {
    if (editingZone && activeZone && dirtyZones.includes(activeZone.zoneCode)) {
      setNotice('Vùng hiện tại có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi chuyển vùng.');
      return;
    }
    setSelectedZone(index);
    setPreviewOpen(false);
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
    setZoneActionStates((current) => ({ ...current, [activeZone.zoneCode]: 'dirty' }));
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
    const hadUnsavedChanges = dirtyZones.includes(activeZone.zoneCode);
    setDirtyZones((current) => current.filter((code) => code !== activeZone.zoneCode));
    if (hadUnsavedChanges) {
      setZoneActionStates((current) => ({ ...current, [activeZone.zoneCode]: 'ready' }));
    }
    setEditingZone(false);
    setEditBaseline(null);
    setNotice('Đã hủy các chỉnh sửa chưa lưu của vùng ' + activeZone.zoneCode + '.');
  };

  const saveActiveZone = async () => {
    if (!result || !activeZone) return;
    setBusy(true);
    setBusyAction('save');
    setError('');
    try {
      await yieldToNextPaint();
      const normalizedRows = activeZone.rows.map((row) => {
        const quantity = normalizeEditableQuantity(row.quantity);
        const updated = { ...row, quantity };
        const retainedIssues = row.issues.filter((issue) =>
          issue.startsWith('Cột MÃ VẠCH') || issue.startsWith('Không thể diễn giải kết quả thực tế:'));
        return { ...updated, issues: [...new Set([...validateRow(updated), ...retainedIssues])] };
      });
      const invalid = normalizedRows.filter((row) => row.issues.length > 0);
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
      const id = await stocktakeImportStore.saveResult(updatedResult, historyId);
      setResult(updatedResult);
      setHistoryId(id);
      setHistoryPersisted(true);
      setDirtyZones((current) => current.filter((code) => code !== activeZone.zoneCode));
      setZoneActionStates((current) => ({ ...current, [activeZone.zoneCode]: 'saved' }));
      setEditingZone(false);
      setEditBaseline(null);
      setNotice('Đã lưu ' + activeZone.zoneCode + ' · ' + activeZone.rows.length + ' dòng. Có thể xuất vùng này.');
      await refreshHistory();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu chỉnh sửa của vùng.');
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  };

  const copyOutput = async () => {
    if (!activeZone) return;
    if (!outputReady) {
      setNotice('Output chưa sẵn sàng. Hãy sửa lỗi và lưu vùng trước khi sao chép.');
      return;
    }
    const textarea = outputTextareaRef.current;
    setNotice('Đang sao chép nội dung TXT…');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API không khả dụng.');
      await navigator.clipboard.writeText(activeZone.content);
      setZoneActionStates((current) => ({ ...current, [activeZone.zoneCode]: 'copied' }));
      setNotice('Đã sao chép nội dung TXT của vùng ' + activeZone.zoneCode + '.');
    } catch {
      if (textarea) {
        textarea.focus();
        textarea.select();
        setNotice('Không thể sao chép tự động. Nội dung TXT đã được chọn riêng trong vùng này; nhấn Ctrl+C hoặc dùng Sao chép trên thiết bị.');
      } else {
        setPreviewOpen(true);
        setNotice('Clipboard tự động không khả dụng. Đã mở bản TXT để bạn chọn và sao chép thủ công.');
      }
    }
  };

  const exportZone = (zoneIndex: number) => {
    if (!result) return;
    const zone = result.zones[zoneIndex];
    if (result.blockingIssues.length > 0) {
      setError('Workbook còn sheet chưa được nhận diện. Hãy xem hướng dẫn lỗi trước khi xuất để tránh bỏ sót dữ liệu.');
      return;
    }
    if (dirtyZones.includes(zone.zoneCode) || zone.rows.some((row) => getRowIssues(row).length > 0)) {
      setError('Vùng ' + zone.zoneCode + ' còn chỉnh sửa chưa lưu hoặc dữ liệu chưa hợp lệ.');
      return;
    }
    downloadText(zone.fileName, zone.content);
    setZoneActionStates((current) => ({ ...current, [zone.zoneCode]: 'downloaded' }));
    setNotice('Đã xuất file vùng ' + zone.zoneCode + '.');
  };

  const exportAll = async () => {
    if (!result || result.zones.length === 0) return;
    if (editingZone || hasDirtyZones || invalidZones.length > 0) {
      setError('Chưa thể xuất ZIP. Hãy xử lý lỗi và lưu chỉnh sửa cho tất cả vùng trước.');
      return;
    }
    setBusy(true);
    setBusyAction('zip');
    setError('');
    try {
      await yieldToNextPaint();
      const zip = await createZipArchive();
      result.zones.forEach((zone) => zip.file(zone.fileName, zone.content));
      const blob = await zip.generateAsync({
        type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
      });
      downloadBlob('KIEM_KE_IMPORT.zip', blob);
      setZoneActionStates(Object.fromEntries(result.zones.map((zone) => [zone.zoneCode, 'zipped'])));
      setNotice('Đã tạo ZIP gồm ' + result.zones.length + ' file TXT, mỗi file tương ứng một vùng.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đóng gói file kết quả.');
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  };

  const clearHistory = async () => {
    setBusy(true);
    setBusyAction('history');
    setError('');
    try {
      await stocktakeImportStore.clearHistory();
      setHistory([]);
      setResult(null);
      setHistoryId(undefined);
      setDirtyZones([]);
      setEditingZone(false);
      setShowClearConfirm(false);
      setNotice('Đã xóa lịch sử và bộ nhớ đệm riêng của Xuất file.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa lịch sử.');
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  };

  const restoreHistoryItem = (item: StocktakeImportHistoryItem) => {
    setResult({
      sourceFileName: item.sourceFileName,
      sourceFiles: item.sourceFiles ?? [],
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
    setHistoryPersisted(true);
    setDirtyZones([]);
    setZoneActionStates(Object.fromEntries(item.files.map((file) => [file.zoneCode, 'saved'])));
    setPreviewOpen(false);
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
          <button className="stocktake-import-icon-button" type="button" disabled={busy}
            onClick={view === 'history' ? () => setView('import') : () => {
              if (hasDirtyZones) { setNotice('Vùng đang có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi đóng module.'); return; }
              onClose();
            }}
            aria-label={view === 'history' ? 'Quay lại' : 'Đóng'}>
            {view === 'history' ? <ArrowLeft size={20} /> : <X size={20} />}
          </button>
          <div>
            <span className="stocktake-import-eyebrow">RETAILOS · KIỂM KÊ</span>
            <h2 id="stocktake-import-title">{view === 'history' ? 'Lịch sử xuất file' : 'Xuất file'}</h2>
          </div>
          <button className="stocktake-import-icon-button" type="button" disabled={busy}
            onClick={() => {
              if (hasDirtyZones) { setNotice('Vùng đang có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi mở lịch sử.'); return; }
              setView('history'); setError('');
            }}
            aria-label="Lịch sử"><History size={19} /></button>
        </header>

        <main className="stocktake-import-content">
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
                <button type="button" disabled={busy} onClick={() => { setPendingImport(null); setNotice('Đã hủy nhập bổ sung. Phiên hiện tại không thay đổi.'); }}>Hủy bổ sung</button>
                {pendingImport.zoneConflicts.length > 0
                  ? <>
                    <button type="button" disabled={busy} onClick={() => void confirmPendingImport(false)}>Bỏ qua vùng trùng</button>
                    <button type="button" disabled={busy} onClick={() => void confirmPendingImport(true)}>Gộp vùng trùng</button>
                  </>
                  : <button type="button" disabled={busy} onClick={() => void confirmPendingImport(true)}>Xác nhận tiếp tục</button>}
              </div>
            </section>
          </div>}
          {showNewSessionConfirm && <div className="stocktake-import-review-backdrop">
            <section className="stocktake-import-review-dialog" role="alertdialog" aria-modal="true" aria-labelledby="stocktake-import-new-session-title">
              <h3 id="stocktake-import-new-session-title">Tạo phiên xử lý mới?</h3>
              <p>Phiên đang mở sẽ được đóng khỏi workspace. Lịch sử đã lưu vẫn được giữ nguyên và có thể khôi phục sau.</p>
              <div className="stocktake-import-review-actions">
                <button type="button" disabled={busy} onClick={() => setShowNewSessionConfirm(false)}>Quay lại</button>
                <button type="button" disabled={busy} onClick={resetActiveSession}>Tạo phiên mới</button>
              </div>
            </section>
          </div>}
          <div className="stocktake-import-intro">
            <div className="stocktake-import-symbol"><FileSpreadsheet size={23} /></div>
            <div><strong>Xử lý workbook ngay trên thiết bị</strong><p>Không tải file lên máy chủ. Có thể sử dụng khi offline.</p></div>
          </div>

          <input ref={inputRef} className="stocktake-import-file-input" type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))} />
          <div className={'stocktake-import-import-actions' + (result ? ' has-session' : '')}>
            <button className="stocktake-import-primary stocktake-import-add-file" type="button" disabled={busy}
              onClick={() => {
                if (hasDirtyZones) { setNotice('Vùng hiện tại có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy trước khi nạp workbook khác.'); return; }
                inputRef.current?.click();
              }}>
              {busyAction === 'import' ? <LoaderCircle className="stocktake-import-spin" size={18} /> : <Upload size={18} />}
              {busyAction === 'import' ? 'Đang xử lý workbook…' : result ? 'Thêm file vào phiên' : 'Chọn file Excel'}
            </button>
            {result && <button className="stocktake-import-secondary stocktake-import-new-session" type="button" disabled={busy || hasDirtyZones}
              onClick={() => setShowNewSessionConfirm(true)}>Tạo phiên mới</button>}
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
                <div className="stocktake-import-zone-nav-heading"><span>CÁC VÙNG</span>{result.zones.length > 1 && <button type="button" className="stocktake-import-zip-compact" disabled={!canExportAll} onClick={() => void exportAll()} title="Xuất tất cả vùng thành ZIP" aria-label="Xuất tất cả vùng thành ZIP">{busyAction === 'zip' ? <LoaderCircle className="stocktake-import-spin" size={13} /> : <Download size={13} />}<span>ZIP</span></button>}</div>
                {result.zones.map((zone, index) => {
                  const rowErrors = zone.rows.filter((row) => getRowIssues(row).length > 0).length;
                  const isDirty = dirtyZones.includes(zone.zoneCode);
                  const actionState = rowErrors || result.blockingIssues.length > 0
                    ? 'invalid'
                    : isDirty || !historyPersisted ? 'dirty' : (zoneActionStates[zone.zoneCode] ?? 'ready');
                  const actionLabel: Record<string, string> = {
                    ready: 'Sẵn sàng', saved: 'Đã lưu', copied: 'Đã sao chép',
                    downloaded: 'Đã tải TXT', zipped: 'Đã xuất ZIP', dirty: 'Chưa lưu',
                    invalid: rowErrors ? rowErrors + ' lỗi' : 'File lỗi',
                  };
                  return <button key={zone.zoneCode} type="button" disabled={busy}
                    className={selectedZone === index ? 'is-active' : ''}
                    aria-current={selectedZone === index ? 'true' : undefined}
                    onClick={() => selectZone(index)}>
                    <span><strong>{zone.zoneCode}</strong><small>{zone.rows.length} dòng · {countUniqueProductCodes(zone.rows)} mã</small></span>
                    <em className={'is-' + actionState}>{actionLabel[actionState]}</em>
                  </button>;
                })}
              </aside>

              {activeZone && <section key={activeZone.zoneCode} className="stocktake-import-zone-workspace" aria-label={'Dữ liệu vùng ' + activeZone.zoneCode}>
                {previewOpen ? <section className="stocktake-import-preview-screen" aria-label={'Xem trước TXT vùng ' + activeZone.zoneCode}>
                  <header className="stocktake-import-preview-screen-heading">
                    <button type="button" disabled={busy} onClick={() => setPreviewOpen(false)}><ArrowLeft size={16} /> Quay lại bảng</button>
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
                        <button type="button" className="stocktake-import-preview-trigger" disabled={busy} onClick={() => setPreviewOpen(true)}><FileText size={15} /> Xem TXT</button>
                        <button type="button" disabled={busy || !outputReady} onClick={() => void copyOutput()}><Copy size={15} /> Sao chép</button>
                        <button type="button" disabled={busy || !outputReady} onClick={() => exportZone(selectedZone)}><Download size={15} /> Tải TXT</button>
                        <button type="button" disabled={busy} onClick={beginEdit}><Pencil size={15} /> Chỉnh sửa</button>
                      </>
                      : <>
                        <button type="button" disabled={busy} onClick={cancelEdit}><X size={15} /> Hủy</button>
                        <button type="button" className="is-save" disabled={busy || !dirtyZones.includes(activeZone.zoneCode)} onClick={() => void saveActiveZone()}>
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
                        {visibleRows.map((row, visibleIndex) => {
                          const rowIndex = page * PAGE_SIZE + visibleIndex;
                          const rowIssues = getRowIssues(row);
                          return <tr key={(row.sourceFileName ?? '') + '-' + (row.sourceSheet ?? '') + '-' + row.sourceRow + '-' + rowIndex}
                            className={rowIssues.length ? 'has-error' : ''}>
                            <td className="stocktake-import-source-row" title={[row.sourceFileName, row.sourceSheet].filter(Boolean).join(' · ')}>
                              {row.sourceSheet ? row.sourceSheet + ' · ' + row.sourceRow : row.sourceRow}
                              {result.sourceFiles && result.sourceFiles.length > 1 && row.sourceFileName && <small>{row.sourceFileName}{row.sourceFileId ? ' · ' + row.sourceFileId.slice(0, 8) : ''}</small>}
                            </td>
                            <td>{editingZone
                              ? <input aria-label={'Mã hàng dòng ' + row.sourceRow} disabled={busy} value={row.barcode}
                                  onChange={(event) => updateRow(rowIndex, 'barcode', event.target.value)} />
                              : <span className="stocktake-import-cell-value">{row.barcode || '—'}</span>}</td>
                            {activeZoneHasProductNames && <td><span className="stocktake-import-cell-value stocktake-import-product-name">{row.productName || '—'}</span></td>}
                            <td>{editingZone
                              ? <input aria-label={'Kết quả thực tế dòng ' + row.sourceRow} disabled={busy} inputMode="decimal"
                                  value={row.quantity} onChange={(event) => updateRow(rowIndex, 'quantity', event.target.value)} />
                              : <strong className="stocktake-import-cell-value">{row.quantity || '—'}</strong>}</td>
                            <td><span className="stocktake-import-source-tag">{row.barcodeSource}</span></td>
                            <td>{rowIssues.length
                              ? <span className="stocktake-import-row-error" title={rowIssues.join(' ')}>{rowIssues.join(' ')}</span>
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
                      <button type="button" disabled={busy || page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft size={16} /> Trước</button>
                      <strong>{page + 1}/{pageCount}</strong>
                      <button type="button" disabled={busy || page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Tiếp <ChevronRight size={16} /></button>
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
            <button type="button" disabled={busy || history.length === 0} onClick={() => setShowClearConfirm(true)}><Trash2 size={15} /> Xóa</button>
          </div>
          {historyBusy ? <p className="stocktake-import-muted">Đang đọc lịch sử…</p> :
            history.length === 0 ? <p className="stocktake-import-muted">Chưa có lịch sử xuất file.</p> :
              <div className="stocktake-import-history-list">
                {history.map((item) => <article key={item.id}>
                  <FileSpreadsheet size={19} />
                  <div><strong>{item.sourceFileName}</strong><p>{item.zoneCount} vùng · {item.rowCount} dòng</p><small>{localDate(item.importedAt)}</small></div>
                  <button type="button" disabled={busy || historyExportingId !== null} onClick={() => restoreHistoryItem(item)}>Mở</button>
                  <button type="button" disabled={busy || historyExportingId !== null} onClick={async () => {
                    setHistoryExportingId(item.id);
                    setError('');
                    try {
                      await yieldToNextPaint();
                      const zip = await createZipArchive();
                      item.files.forEach((file) => zip.file(buildZoneFileName(file.zoneCode), file.content));
                      const blob = await zip.generateAsync({ type: 'blob' });
                      downloadBlob('KIEM_KE_IMPORT.zip', blob);
                      setNotice('Đã tải lại ZIP của phiên ' + item.sourceFileName + '.');
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : 'Không thể tạo ZIP từ lịch sử.');
                    } finally {
                      setHistoryExportingId(null);
                    }
                  }} aria-label="Tải lại kết quả">{historyExportingId === item.id ? <LoaderCircle className="stocktake-import-spin" size={16} /> : <Download size={16} />}</button>
                </article>)}
              </div>}
        </>}

        <footer className="stocktake-import-footer"><span>Dữ liệu xử lý được lưu riêng với module Xuất file</span><span>RetailOS</span></footer>
        </main>
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
          <div><button type="button" disabled={busy} onClick={() => setShowClearConfirm(false)}>Giữ lại</button><button type="button" disabled={busy} onClick={() => void clearHistory()}>{busyAction === 'history' ? 'Đang xóa…' : 'Xóa lịch sử'}</button></div>
        </section>
      </div>}
    </div>
  );
}
