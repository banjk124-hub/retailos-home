import { useCallback, useEffect, useMemo, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import StocktakeScanner from './StocktakeScanner';
import StocktakePresentation, { type StocktakeScreen } from './StocktakePresentation';

import type { EmployeeSession } from '../../../shared/domain/employee';
import { LOCAL_EMPLOYEE_DIRECTORY } from '../../auth/services/employeeDirectory';
import type { StocktakeEntry, StocktakeExport, StocktakeSession, StocktakeZone } from '../types/stocktake.types';
import { createStocktakeId, logStocktakeAction, stocktakeStore } from '../services/stocktakeLocalStore';
import { createStocktakeFile, downloadStocktakeText } from '../services/stocktakeExport';
import { unlockScannerAudio } from '../../scanner/services/scannerAudio';
import { useScannerViewportStyle } from '../../scanner/hooks/useScannerViewportStyle';
import { requestCameraLease, type CameraLeaseRequest } from '../../../shared/services/cameraSession';
import { DEFAULT_SCANNER_CAMERA_REQUEST } from '../../../platform/scanner/contracts';
import { getMotionOrigin, type MotionOrigin } from '../../../shared/motion';
import { isScannerSupportedDevice } from '../../scanner/services/scannerCapabilities';
import { AppErrorBoundary } from '../../../shared/components/AppErrorBoundary';
import { useBodyScrollLock } from '../../../shared/hooks/useBodyScrollLock';
import { notifyPwaUpdateSafetyChanged, registerPwaUpdateBlocker } from '../../../shared/pwa/updateSafety';

type Props = { employee: EmployeeSession; onClose: () => void };
const STOCKTAKE_LIST_PAGE_SIZE = 100;

function yieldToNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

export default function StocktakeModule({ employee, onClose }: Props) {
  useBodyScrollLock(true);
  const scannerViewportStyle = useScannerViewportStyle();
  const [session, setSession] = useState<StocktakeSession | null>(null);
  const [zones, setZones] = useState<StocktakeZone[]>([]);
  const [entries, setEntries] = useState<StocktakeEntry[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof stocktakeStore.getLogs>>>([]);
  const [exports, setExports] = useState<StocktakeExport[]>([]);
  const [screen, setScreen] = useState<StocktakeScreen>('home');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMotionOrigin, setScannerMotionOrigin] = useState<MotionOrigin | null>(null);
  const cameraLeaseRequestRef = useRef<CameraLeaseRequest | null>(null);
  const closeScanner = () => {
    cameraLeaseRequestRef.current?.cancel();
    cameraLeaseRequestRef.current = null;
    setScannerMotionOrigin(null);
    setScannerOpen(false);
  };
  useEffect(() => () => { cameraLeaseRequestRef.current?.cancel(); }, []);
  const [zoneInput, setZoneInput] = useState('');
  const [pendingZone, setPendingZone] = useState<{ code: string; prefix: string; number: string; previous?: StocktakeZone } | null>(null);
  const [currentZone, setCurrentZone] = useState<StocktakeZone | null>(null);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [busy, setBusy] = useState(true);
  const [reviewVisibleCount, setReviewVisibleCount] = useState(STOCKTAKE_LIST_PAGE_SIZE);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(STOCKTAKE_LIST_PAGE_SIZE);
  const [error, setError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const pwaUpdateStateRef = useRef({
    busy, scannerOpen, pendingZone, showClearConfirm, editingEntry, manualEntry, barcode, quantity, zoneInput,
  });
  pwaUpdateStateRef.current = {
    busy, scannerOpen, pendingZone, showClearConfirm, editingEntry, manualEntry, barcode, quantity, zoneInput,
  };

  const resolvedEmployeeCode = employee.employeeCode.trim() || LOCAL_EMPLOYEE_DIRECTORY.find((record) => record.name === employee.name && record.departmentId === employee.departmentId && record.active !== false)?.employeeCode || '';

  const refresh = useCallback(async () => {
    const [allZones, allExports] = await Promise.all([
      stocktakeStore.getZones(), stocktakeStore.getExports(),
    ]);
    setZones(allZones);
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

  useLayoutEffect(() => registerPwaUpdateBlocker('stocktake', () => {
    const state = pwaUpdateStateRef.current;
    if (state.busy) return 'Stocktake đang ghi hoặc đọc dữ liệu kiểm kê.';
    if (state.scannerOpen) return 'Máy quét đang hoạt động. Hãy đóng phiên quét trước khi cập nhật.';
    if (state.pendingZone || state.showClearConfirm) return 'Stocktake đang chờ xác nhận thao tác.';
    if (state.editingEntry || state.manualEntry || state.barcode.trim() || state.quantity !== '1' || state.zoneInput.trim()) {
      return 'Stocktake có nội dung nhập hoặc chỉnh sửa chưa hoàn tất.';
    }
    return null;
  }), []);

  useEffect(() => {
    notifyPwaUpdateSafetyChanged();
  }, [busy, scannerOpen, pendingZone, showClearConfirm, editingEntry, manualEntry, barcode, quantity, zoneInput]);

  // loadZoneEntries already scopes and sorts entries for the active zone.
  const currentEntries = entries;
  const visibleReviewEntries = currentEntries.slice(0, reviewVisibleCount);
  const currentSessionLogs = useMemo(
    () => logs.filter((log) => log.sessionId === session?.id),
    [logs, session?.id],
  );
  const currentSessionZones = useMemo(
    () => zones.filter((zone) => zone.sessionId === session?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [zones, session?.id],
  );
  const visibleSessionZones = useMemo(
    () => currentSessionZones.filter((zone) => zone.status !== 'superseded'),
    [currentSessionZones],
  );
  const currentSessionExports = useMemo(
    () => exports.filter((item) => item.sessionId === session?.id),
    [exports, session?.id],
  );
  const visibleHistoryLogs = currentSessionLogs.slice(0, historyVisibleCount);

  const loadZoneEntries = async (zone: StocktakeZone) => {
    const allEntries = await stocktakeStore.getEntries();
    setEntries(allEntries.filter((entry) => entry.zoneId === zone.id).sort((a, b) => a.sequence - b.sequence));
  };

  const openHistory = async () => {
    if (!session || busy) return;
    setBusy(true);
    try {
      const allLogs = await stocktakeStore.getLogs();
      setLogs(allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      setHistoryVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      setScreen('history');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải nhật ký kiểm kê.');
    } finally {
      setBusy(false);
    }
  };

  const beginZone = async (replace: boolean, requested = pendingZone) => {
    if (!session || !requested || busy) return;
    setBusy(true);
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
      setReviewVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      setPendingZone(null);
      setZoneInput('');
      setScreen('scan');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo vùng kiểm kê.');
    } finally {
      setBusy(false);
    }
  };

  const resumeZone = async (zone: StocktakeZone) => {
    if (busy) return;
    setBusy(true);
    try {
      setCurrentZone(zone);
      setReviewVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      await loadZoneEntries(zone);
      await logStocktakeAction({
        sessionId: zone.sessionId,
        zoneId: zone.id,
        action: 'ZONE_RESUMED',
        details: `Mở lại vùng ${zone.zoneCode}, revision ${zone.revision}.`,
      });
      await refresh();
      setScreen(zone.status === 'exported' ? 'review' : 'scan');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể mở lại vùng kiểm kê.');
    } finally {
      setBusy(false);
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
    // Keep the scanner surface mounted until its exit transition completes.
    cameraLeaseRequestRef.current = null;
    setBarcode(value.trim());
    setQuantity('1');
    setManualEntry(false);
    setScreen('scan');
  };

  const saveEntry = async () => {
    if (!session || !currentZone || busy) return;
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
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const editEntry = (entry: StocktakeEntry) => {
    setEditingEntry(entry.id);
    setBarcode(entry.barcode);
    setQuantity(String(entry.quantity));
    setManualEntry(true);
  };

  const removeEntry = async (entry: StocktakeEntry) => {
    if (!session || busy || !window.confirm(`Xóa dòng ${entry.sequence} — ${entry.barcode}?`)) return;
    setBusy(true);
    try {
      await stocktakeStore.deleteEntry(entry.id);
      await logStocktakeAction({
        sessionId: session.id, zoneId: entry.zoneId, action: 'ENTRY_DELETED',
        details: `Xóa dòng ${entry.sequence}: ${entry.barcode} × ${entry.quantity}.`,
      });
      if (currentZone) await loadZoneEntries(currentZone);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa dòng kiểm kê.');
    } finally {
      setBusy(false);
    }
  };

  const openReview = async () => {
    if (!currentZone || !session || busy) return;
    setBusy(true);
    try {
      await loadZoneEntries(currentZone);
      await logStocktakeAction({ sessionId: session.id, zoneId: currentZone.id, action: 'ZONE_REVIEW_OPENED', details: `Mở kiểm tra dữ liệu vùng ${currentZone.zoneCode}, revision ${currentZone.revision}.` });
      await refresh();
      setReviewVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      setScreen('review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể mở kiểm tra dữ liệu vùng.');
    } finally {
      setBusy(false);
    }
  };

  const exportCurrentZone = async () => {
    if (!session || !currentZone || busy) return;
    if (currentEntries.length === 0) {
      setError('Vùng chưa có dữ liệu ARTICLE. Hãy quét hoặc thêm ít nhất một dòng.');
      return;
    }
    setBusy(true);
    try {
      await yieldToNextPaint();
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
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!resolvedEmployeeCode) {
      setError('Không thể xóa hoặc tạo phiên kiểm kê khi chưa xác định được mã nhân viên.');
      setShowClearConfirm(false);
      return;
    }
    setBusy(true);
    try {
      await stocktakeStore.clearAll();
      closeScanner();
      setSession(null);
      setCurrentZone(null);
      setEntries([]);
      setReviewVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      setHistoryVisibleCount(STOCKTAKE_LIST_PAGE_SIZE);
      setZones([]);
      setLogs([]);
      setExports([]);
      setShowClearConfirm(false);
      setScreen('home');
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

  const presentationModel = {
    employee,
    screen,
    session,
    error,
    zoneInput,
    currentSessionExports,
    visibleSessionZones,
    currentSessionZones,
    currentSessionLogs,
    visibleHistoryLogs,
    currentEntries,
    visibleReviewEntries,
    currentZone,
    barcode,
    quantity,
    editingEntry,
    scannerSupported: screen === 'scan' && isScannerSupportedDevice(),
    busy,
    pendingZone,
    showClearConfirm,
  };

  const presentationActions = {
    onClose,
    onBackHome: () => { setScreen('home'); setError(''); },
    onZoneInputChange: (value: string) => setZoneInput(value.toUpperCase().replace(/[^A-Z0-9]/g, '')),
    onSubmitZone: () => { void submitZone(); },
    onOpenHistory: () => { void openHistory(); },
    onOpenExports: () => setScreen('exports'),
    onResumeZone: (zone: StocktakeZone) => { void resumeZone(zone); },
    onRequestClear: () => setShowClearConfirm(true),
    onOpenScanner: (button: HTMLButtonElement) => {
      if (scannerOpen) return;
      cameraLeaseRequestRef.current = requestCameraLease(DEFAULT_SCANNER_CAMERA_REQUEST);
      setScannerMotionOrigin(getMotionOrigin(button));
      void unlockScannerAudio();
      setScannerOpen(true);
      if (session && currentZone) void logStocktakeAction({
        sessionId: session.id,
        zoneId: currentZone.id,
        action: 'SCANNER_OPENED',
        details: `Mở máy quét tại vùng ${currentZone.zoneCode}.`,
      });
    },
    onBarcodeChange: setBarcode,
    onQuantityChange: setQuantity,
    onSaveEntry: () => { void saveEntry(); },
    onOpenReview: () => { void openReview(); },
    onPauseZone: () => {
      if (session && currentZone) void logStocktakeAction({
        sessionId: session.id,
        zoneId: currentZone.id,
        action: 'ZONE_PAUSED',
        details: `Tạm dừng vùng ${currentZone.zoneCode}.`,
      });
      setScreen('home');
      setCurrentZone(null);
    },
    onEditEntry: (entry: StocktakeEntry, returnToScan = false) => {
      editEntry(entry);
      if (returnToScan) setScreen('scan');
    },
    onEnterManualEntry: (returnToScan = false) => {
      setManualEntry(true);
      setEditingEntry(null);
      setBarcode('');
      setQuantity('1');
      if (returnToScan) setScreen('scan');
    },
    onLoadMoreReview: () => setReviewVisibleCount((count) => Math.min(currentEntries.length, count + STOCKTAKE_LIST_PAGE_SIZE)),
    onRemoveEntry: (entry: StocktakeEntry) => { void removeEntry(entry); },
    onExportCurrentZone: () => { void exportCurrentZone(); },
    onBackToScan: () => setScreen('scan'),
    onLoadMoreHistory: () => setHistoryVisibleCount((count) => Math.min(currentSessionLogs.length, count + STOCKTAKE_LIST_PAGE_SIZE)),
    onDownloadPreviousExport: downloadPreviousExport,
    onCancelReplace: () => setPendingZone(null),
    onConfirmReplace: () => { void beginZone(true); },
    onCancelClear: () => setShowClearConfirm(false),
    onConfirmClear: () => { void clearAll(); },
  };

  if (busy) {
    return <StocktakePresentation model={presentationModel} actions={presentationActions} />;
  }

  return (
    <>
      <StocktakePresentation model={presentationModel} actions={presentationActions} />
      {scannerOpen && screen === 'scan' && (
        <div className="stocktake-scanner-layer scanner-stocktake-layer-enter" style={{ ...scannerViewportStyle, '--scanner-origin-x': scannerMotionOrigin ? `${scannerMotionOrigin.x}px` : '50vw', '--scanner-origin-y': scannerMotionOrigin ? `${scannerMotionOrigin.y}px` : '50vh' } as CSSProperties & { '--scanner-origin-x': string; '--scanner-origin-y': string; '--scanner-visual-viewport-height': string; '--scanner-visual-viewport-top': string }}>
          <AppErrorBoundary fallback={<div className="stocktake-error" role="alert"><p>Không thể tải máy quét. Hãy đóng cửa sổ và thử lại.</p><button type="button" onClick={closeScanner}>Đóng</button></div>}>
            <StocktakeScanner onDetected={acceptBarcode} onClose={closeScanner} cameraLeaseRequest={cameraLeaseRequestRef.current} motionOrigin={scannerMotionOrigin} />
          </AppErrorBoundary>
        </div>
      )}
    </>
  );
}
