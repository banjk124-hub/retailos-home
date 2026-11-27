import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EmployeeSession } from '../../../shared/domain/employee';
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
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import { downloadFile } from '../../../shared/downloadFile';
import { notifyPwaUpdateSafetyChanged, registerPwaUpdateBlocker } from '../../../shared/pwa/updateSafety';
import StocktakeImportPresentation, {
  type PendingImportReview,
  type StocktakeImportBusyAction,
  type StocktakeImportView,
  type StocktakeImportZoneActionState,
} from './StocktakeImportPresentation';

type Props = { employee: EmployeeSession; onClose: () => void };
type View = StocktakeImportView;
type ZoneActionState = StocktakeImportZoneActionState;
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
  downloadFile(blob, fileName, 1500);
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
  const [busyAction, setBusyAction] = useState<StocktakeImportBusyAction>(null);
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

  const pwaUpdateStateRef = useRef({
    busy, historyBusy, historyExportingId, editingZone, hasDirtyZones, pendingImport,
    result, historyPersisted, showClearConfirm, showNewSessionConfirm,
  });
  pwaUpdateStateRef.current = {
    busy, historyBusy, historyExportingId, editingZone, hasDirtyZones, pendingImport,
    result, historyPersisted, showClearConfirm, showNewSessionConfirm,
  };

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

  useLayoutEffect(() => registerPwaUpdateBlocker('stocktake-import', () => {
    const state = pwaUpdateStateRef.current;
    if (state.busy || state.historyBusy || state.historyExportingId) {
      return 'Stocktake Import đang xử lý hoặc đồng bộ lịch sử trên thiết bị.';
    }
    if (state.editingZone || state.hasDirtyZones) return 'Stocktake Import có vùng đang chỉnh sửa hoặc chưa lưu.';
    if (state.pendingImport) return 'Đang chờ xác nhận dữ liệu nhập bổ sung.';
    if (state.result && !state.historyPersisted) {
      return 'Phiên nhập hiện tại chưa được lưu thành công vào lịch sử trên thiết bị.';
    }
    if (state.showClearConfirm || state.showNewSessionConfirm) {
      return 'Đang chờ xác nhận thao tác trong Stocktake Import.';
    }
    return null;
  }), []);

  useEffect(() => {
    notifyPwaUpdateSafetyChanged();
  }, [busy, historyBusy, historyExportingId, editingZone, hasDirtyZones, pendingImport, result, historyPersisted, showClearConfirm, showNewSessionConfirm]);

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

  const zoneItems = (result?.zones ?? []).map((zone, index) => {
    const rowErrors = zone.rows.filter((row) => getRowIssues(row).length > 0).length;
    const isDirty = dirtyZones.includes(zone.zoneCode);
    const actionState = rowErrors || (result?.blockingIssues.length ?? 0) > 0
      ? 'invalid'
      : isDirty || !historyPersisted ? 'dirty' : (zoneActionStates[zone.zoneCode] ?? 'ready');
    const actionLabel: Record<string, string> = {
      ready: 'Sẵn sàng', saved: 'Đã lưu', copied: 'Đã sao chép',
      downloaded: 'Đã tải TXT', zipped: 'Đã xuất ZIP', dirty: 'Chưa lưu',
      invalid: rowErrors ? rowErrors + ' lỗi' : 'File lỗi',
    };
    return { zone, index, rowErrors, actionState, actionLabel: actionLabel[actionState] };
  });
  const visibleRows = activeZone?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    .map((row, visibleIndex) => ({
      row,
      issues: getRowIssues(row),
      rowIndex: page * PAGE_SIZE + visibleIndex,
    })) ?? [];

  const onClose = () => {
    if (hasDirtyZones) {
      setNotice('Vùng đang có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi đóng module.');
      return;
    }
    onClose();
  };
  const onOpenHistory = () => {
    if (hasDirtyZones) {
      setNotice('Vùng đang có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy chỉnh sửa trước khi mở lịch sử.');
      return;
    }
    setView('history');
    setError('');
  };
  const onSelectFile = () => {
    if (hasDirtyZones) {
      setNotice('Vùng hiện tại có chỉnh sửa chưa lưu. Hãy lưu hoặc hủy trước khi nạp workbook khác.');
      return;
    }
    inputRef.current?.click();
  };
  const onDownloadHistoryZip = async (item: StocktakeImportHistoryItem) => {
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
  };

  const presentationModel = {
    view, result, history, historyBusy, historyPersisted, historyExportingId, busy, busyAction, error, notice,
    noticeTone, showClearConfirm, showNewSessionConfirm, pendingImport, selectedZone, activeZone, dirtyZones,
    editingZone, page, pageCount, visibleRows, totalRows, totalUniqueProducts, activeZoneUniqueProducts,
    activeZoneHasProductNames, invalidCount, outputReady, canExportAll, zoneItems, previewOpen,
    fileInputRef: inputRef, outputTextareaRef,
  };

  const presentationActions = {
    onClose,
    onBackFromHistory: () => setView('import'),
    onOpenHistory,
    onSelectFile,
    onFilesSelected: (files: File[]) => { void handleFiles(files); },
    onCancelPendingImport: () => {
      setPendingImport(null);
      setNotice('Đã hủy nhập bổ sung. Phiên hiện tại không thay đổi.');
    },
    onConfirmPendingImport: (mergeConflicts: boolean) => { void confirmPendingImport(mergeConflicts); },
    onRequestNewSession: () => setShowNewSessionConfirm(true),
    onCancelNewSession: () => setShowNewSessionConfirm(false),
    onResetActiveSession: resetActiveSession,
    onSelectZone: selectZone,
    onOpenPreview: () => setPreviewOpen(true),
    onClosePreview: () => setPreviewOpen(false),
    onCopyOutput: () => { void copyOutput(); },
    onExportZone: exportZone,
    onExportAll: () => { void exportAll(); },
    onBeginEdit: beginEdit,
    onCancelEdit: cancelEdit,
    onSaveActiveZone: () => { void saveActiveZone(); },
    onUpdateRow: updateRow,
    onSetPage: setPage,
    onRequestClear: () => setShowClearConfirm(true),
    onCancelClear: () => setShowClearConfirm(false),
    onClearHistory: () => { void clearHistory(); },
    onRestoreHistoryItem: restoreHistoryItem,
    onDownloadHistoryZip: (item: StocktakeImportHistoryItem) => { void onDownloadHistoryZip(item); },
  };

  return <StocktakeImportPresentation model={presentationModel} actions={presentationActions} />;
}
