import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import {
  Activity, ArrowUpRight, Check, CalendarDays, ChevronLeft, ChevronRight,
  LogOut, PackageSearch, ScanBarcode, Search, ShieldCheck, X,
} from 'lucide-react';
import type { EmployeeSession } from '../auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import { BrandMark } from '../../shared/brand';
import { AppErrorBoundary } from '../../shared/components/AppErrorBoundary';
import { GlassSurface } from '../../shared/components/glass';
import { getCachedModuleSnapshots, MODULE_SNAPSHOTS_UPDATED_EVENT } from '../data/moduleDataService';
import { readHomeUiState, saveHomeUiState } from './homeStateStore';
import { calculateSnapshotNotices, HOME_NOTICE_MODULE_IDS, type SnapshotNotice } from './snapshotNoticeRules';
import { lookupCachedBarcode, searchCachedProducts, type BarcodeProductRecord } from '../scanner/services/barcodeLookup';
import { isScannerSupportedDevice } from '../scanner/services/scannerCapabilities';
import { HomeModuleLibrarySection } from './components/HomeModuleLibrarySection';
import { OperationalHome } from '../../experience/home/OperationalHome';
import type { ModuleLibraryDefinition, RetailModule } from './moduleRegistry';
import { getHomeNavigationIcon, getLibraryIcon, getModuleIcon, MotionIcon } from '../../shared/icons';
import { LiquidDock } from '../../shared/navigation';
import { getMotionOrigin, MOTION_CONFIG, MotionSheet, useMotionState } from '../../shared/motion';
import type { MotionOrigin } from '../../shared/motion';
import '../../styles/home.css';
import '../../styles/home-ux.css';
import '../../styles/home-engine.css';
import '../../styles/home-redesign.css';
import '../../styles/home-architecture.css';
import '../../experience/home/operational-home.css';
import { unlockScannerAudio } from '../scanner/services/scannerAudio';
import { requestCameraLease, type CameraLeaseRequest } from '../../shared/services/cameraSession';
import { DEFAULT_SCANNER_CAMERA_REQUEST } from '../../platform/scanner/contracts';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import { clearUpdateCenterEntry, getPendingUpdateNoticeCount, readUpdateCenterEntry, UPDATE_CENTER_CHANGED_EVENT } from '../../shared/pwa/updateCenterStore';
declare const __RETAILOS_BUILD_ID__: string;

const BarcodeScanner = lazy(() => import('../scanner/components/BarcodeScanner'));
const StocktakeModule = lazy(() => import('../stocktake/components/StocktakeModule'));
const StocktakeImportModule = lazy(() => import('../stocktake-import/components/StocktakeImportModule'));
const SettingsHub = lazy(() => import('./components/SettingsHub'));
const ScannerSettingsPanel = lazy(() => import('../scanner/components/ScannerSettingsPanel'));
 
// Isolate active feature trees from unrelated Home state updates.
const MemoizedBarcodeScanner = memo((props: React.ComponentProps<typeof BarcodeScanner>) => <BarcodeScanner {...props} />);
const MemoizedStocktakeModule = memo((props: React.ComponentProps<typeof StocktakeModule>) => <StocktakeModule {...props} />);
const MemoizedStocktakeImportModule = memo((props: React.ComponentProps<typeof StocktakeImportModule>) => <StocktakeImportModule {...props} />);
const MemoizedSettingsHub = memo((props: React.ComponentProps<typeof SettingsHub>) => <SettingsHub {...props} />);
const MemoizedScannerSettingsPanel = memo((props: React.ComponentProps<typeof ScannerSettingsPanel>) => <ScannerSettingsPanel {...props} />);


type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  onLogout: () => void;
  isEnteringHome: boolean;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
  onBootReady: () => void;
};
function ModuleLoadingSurface({ title, onClose }: { title: string; onClose: () => void }) {
  const headingId = `module-loading-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="module-loading-backdrop">
      <section className="module-loading-panel" aria-labelledby={headingId}>
        <div role="status" aria-live="polite" aria-busy="true">
          <span className="module-loading-indicator" aria-hidden="true" />
          <h2 id={headingId}>Đang mở {title}…</h2>
          <p>Đang tải giao diện chức năng.</p>
        </div>
        <button type="button" onClick={onClose} aria-label={`Đóng trạng thái tải ${title}`}>Đóng</button>
      </section>
    </div>
  );
}

type SnapshotNoticeStatus = 'loading' | 'ready' | 'empty' | 'unavailable';

const navItems = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'modules', label: 'Module' },
  { id: 'activity', label: 'Hoạt động' },
  { id: 'settings', label: 'Cài đặt' },
];

const HOME_DOCK_ITEMS = navItems.map((item) => ({
  ...item,
  icon: getHomeNavigationIcon(item.id),
}));

export default function HomeScreen({
  employee, department, onLogout, isEnteringHome, isOffline, canInstall, onInstall, onBootReady,
}: Props) {
  useEffect(() => {
    onBootReady();
    const pendingUpdate = readUpdateCenterEntry();
    if (pendingUpdate?.buildId === __RETAILOS_BUILD_ID__) clearUpdateCenterEntry(pendingUpdate.buildId);
  }, [onBootReady]);
  const { prefersReducedMotion } = useMotionState();
  const [initialUiState] = useState(readHomeUiState);
  const searchRef = useRef(initialUiState.search);
  const [activeNav, setActiveNav] = useState(
    navItems.some((item) => item.id === initialUiState.activeNav && item.id !== 'settings')
      ? initialUiState.activeNav
      : 'home',
  );
  const activeNavRef = useRef(activeNav);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannerMotionOrigin, setScannerMotionOrigin] = useState<MotionOrigin | null>(null);
  const cameraLeaseRequestRef = useRef<CameraLeaseRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    const openSettings = () => setShowSettings(true);
    const openNotifications = () => document.getElementById('retailos-home-signals')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    window.addEventListener('retailos:open-settings', openSettings);
    window.addEventListener('retailos:open-notifications', openNotifications);
    return () => {
      window.removeEventListener('retailos:open-settings', openSettings);
      window.removeEventListener('retailos:open-notifications', openNotifications);
    };
  }, []);
  const [updateNoticeCount, setUpdateNoticeCount] = useState(getPendingUpdateNoticeCount);
  const [showScannerSettings, setShowScannerSettings] = useState(false);
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setActiveNav('home');
  }, []);
  const openScannerSettings = useCallback(() => {
    setShowSettings(false);
    setShowScannerSettings(true);
  }, []);
  const closeScannerSettings = useCallback(() => {
    setShowScannerSettings(false);
    setShowSettings(true);
  }, []);
  useEffect(() => () => { cameraLeaseRequestRef.current?.cancel(); }, []);
  const [barcodeLookup, setBarcodeLookup] = useState<{
    query: string;
    requestId: number;
    records: BarcodeProductRecord[] | null;
    error?: string;
    failedSources?: string[];
  } | null>(null);
  const barcodeLookupRequestIdRef = useRef(0);
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const scrollSaveTimer = useRef<number | null>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const calendarCloseRef = useRef<HTMLButtonElement>(null);
  const calendarCloseTimer = useRef<number | null>(null);
  const [priorityNotices, setPriorityNotices] = useState<SnapshotNotice[]>([]);
  const [snapshotNoticeStatus, setSnapshotNoticeStatus] = useState<SnapshotNoticeStatus>('loading');
  const [selectedNotice, setSelectedNotice] = useState<SnapshotNotice | null>(null);
  const [isNoticeClosing, setIsNoticeClosing] = useState(false);
  const noticeCloseTimer = useRef<number | null>(null);
  const noticeCloseButtonRef = useRef<HTMLButtonElement>(null);
  const noticeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibraryDefinition | null>(null);
  const [selectedLibraryModules, setSelectedLibraryModules] = useState<RetailModule[]>([]);
  const [isStocktakeOpen, setIsStocktakeOpen] = useState(false);
  const [isStocktakeImportOpen, setIsStocktakeImportOpen] = useState(false);
  const closeStocktake = useCallback(() => setIsStocktakeOpen(false), []);
  const closeStocktakeImport = useCallback(() => setIsStocktakeImportOpen(false), []);
  const [libraryOrigin, setLibraryOrigin] = useState<MotionOrigin | undefined>();
  const [isLibraryClosing, setIsLibraryClosing] = useState(false);
  const libraryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const libraryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [toast, setToast] = useState('');
  useBodyScrollLock(
    showCalendar || Boolean(selectedNotice) || Boolean(selectedLibrary)
    || isBarcodeScannerOpen || showSettings || showScannerSettings
    || isStocktakeOpen || isStocktakeImportOpen || Boolean(barcodeLookup),
  );
  const snapshotNoticeStatusMessage = snapshotNoticeStatus === 'loading'
    ? 'Đang kiểm tra snapshot đã lưu trên thiết bị…'
    : snapshotNoticeStatus === 'empty'
      ? 'Chưa có snapshot trên thiết bị. Cảnh báo sẽ xuất hiện sau khi dữ liệu được đồng bộ.'
      : snapshotNoticeStatus === 'unavailable'
          ? 'Không thể đọc snapshot trên thiết bị; chưa thể xác nhận trạng thái cảnh báo.'
          : 'Không phát hiện cảnh báo trong snapshot đang lưu.';
  useEffect(() => { const sync = () => setUpdateNoticeCount(getPendingUpdateNoticeCount()); sync(); window.addEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(UPDATE_CENTER_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); }; }, []);

  useEffect(() => {
    let isCurrent = true;
    const loadSnapshotNotices = async () => {
      setSnapshotNoticeStatus('loading');
      try {
        const snapshots = await getCachedModuleSnapshots(HOME_NOTICE_MODULE_IDS);
        if (!isCurrent) return;
        setPriorityNotices(calculateSnapshotNotices(snapshots));
        setSnapshotNoticeStatus(snapshots.length === 0 ? 'empty' : 'ready');
      } catch (error) {
        if (!isCurrent) return;
        console.error('Không thể đọc snapshot để tính thông báo:', error);
        setPriorityNotices([]);
        setSnapshotNoticeStatus('unavailable');
      }
    };

    void loadSnapshotNotices();
    window.addEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    return () => {
      isCurrent = false;
      window.removeEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshotNotices);
    };
  }, []);
  const calendarWeek = useMemo(() => {
    const today = new Date(calendarNow.getFullYear(), calendarNow.getMonth(), calendarNow.getDate());
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        date,
        weekday: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
        day: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }, [calendarNow]);
  const calendarMonthDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [calendarMonth]);

  useEffect(() => {
    const syncCalendarDate = () => {
      const now = new Date();
      setCalendarNow((current) => current.toDateString() === now.toDateString() ? current : now);
    };
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = window.setTimeout(syncCalendarDate, Math.max(1, nextMidnight.getTime() - now.getTime()));
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncCalendarDate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calendarNow]);

  const closeCalendar = () => {
    if (calendarCloseTimer.current !== null) return;
    setIsCalendarClosing(true);
    calendarCloseTimer.current = window.setTimeout(() => {
      calendarCloseTimer.current = null;
      setShowCalendar(false);
    }, 300);
  };

  const openNotice = (notice: SnapshotNotice, trigger: HTMLButtonElement) => {
    noticeTriggerRef.current = trigger;
    setSelectedNotice(notice);
    setIsNoticeClosing(false);
  };
  const closeNotice = () => {
    if (noticeCloseTimer.current !== null) return;
    setIsNoticeClosing(true);
    noticeCloseTimer.current = window.setTimeout(() => {
      noticeCloseTimer.current = null;
      setSelectedNotice(null);
      setIsNoticeClosing(false);
    }, 240);
  };
  const openLibrary = useCallback((library: ModuleLibraryDefinition, modules: RetailModule[], trigger: HTMLButtonElement) => {
    libraryTriggerRef.current = trigger;
    setSelectedLibraryModules(modules);
    setLibraryOrigin(getMotionOrigin(trigger));
    setIsLibraryClosing(false);
    setSelectedLibrary(library);
  }, []);
  const closeLibrary = () => {
    if (isLibraryClosing) return;
    if (prefersReducedMotion) {
      setSelectedLibrary(null);
      setLibraryOrigin(undefined);
      setIsLibraryClosing(false);
      return;
    }
    setIsLibraryClosing(true);
  };
  const finishLibraryClose = (event: React.AnimationEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== MOTION_CONFIG.animations.sheetExit) return;
    setSelectedLibrary(null);
    setLibraryOrigin(undefined);
    setIsLibraryClosing(false);
  };
  useEffect(() => {
    if (!showCalendar) return;
    calendarCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCalendar();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      calendarButtonRef.current?.focus();
    };
  }, [showCalendar]);

  useEffect(() => {
    if (!selectedNotice) return;
    noticeCloseButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNotice();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (noticeTriggerRef.current?.isConnected) noticeTriggerRef.current.focus();
    };
  }, [selectedNotice]);

  useEffect(() => {
    if (!selectedLibrary) return;
    libraryCloseButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLibrary();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (libraryTriggerRef.current?.isConnected) libraryTriggerRef.current.focus();
    };
  }, [selectedLibrary]);

  useEffect(() => () => {
    if (calendarCloseTimer.current !== null) {
      window.clearTimeout(calendarCloseTimer.current);
      calendarCloseTimer.current = null;
    }
    if (noticeCloseTimer.current !== null) {
      window.clearTimeout(noticeCloseTimer.current);
      noticeCloseTimer.current = null;
    }
  }, []);

  const openCalendar = () => {
    const today = new Date();
    setCalendarNow((current) => current.toDateString() === today.toDateString() ? current : today);
    setSelectedCalendarDate(today);
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setIsCalendarClosing(false);
    calendarCloseTimer.current = null;
    setShowCalendar(true);
  };
  const finishCalendarClose = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.animationName !== 'calendar-backdrop-out') return;
    if (calendarCloseTimer.current !== null) window.clearTimeout(calendarCloseTimer.current);
    calendarCloseTimer.current = null;
    setShowCalendar(false);
  };
  const moveCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };
  const selectCalendarDate = (date: Date) => {
    setSelectedCalendarDate(date);
    if (date.getMonth() !== calendarMonth.getMonth() || date.getFullYear() !== calendarMonth.getFullYear()) {
      setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  useEffect(() => {
    // Restore the last viewed location after a reload. The authenticated
    // identity and Home UI state are independent, so future module state can
    // be added to homeStateStore without changing the app shell.
    const restore = window.requestAnimationFrame(() => {
      if (initialUiState.scrollY > 0) window.scrollTo({ top: initialUiState.scrollY, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(restore);
  }, [initialUiState]);

  useEffect(() => {
    activeNavRef.current = activeNav;
    saveHomeUiState({ activeNav, search: searchRef.current, scrollY: window.scrollY });
  }, [activeNav]);

  useEffect(() => {
    let frame = 0;
    const syncActiveSection = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activationLine = window.innerHeight * 0.38;
        const modulesTop = document.getElementById('modules')?.getBoundingClientRect().top ?? Infinity;
        const activityTop = document.getElementById('activity')?.getBoundingClientRect().top ?? Infinity;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const isAtBottom = maxScroll > 0 && window.scrollY >= maxScroll - 2;
        const nextActiveNav = isAtBottom || activityTop <= activationLine
          ? 'activity'
          : modulesTop <= activationLine
            ? 'modules'
            : 'home';
        setActiveNav((current) => current === nextActiveNav ? current : nextActiveNav);
        frame = 0;
      });
    };
    const persistCurrentUi = () => saveHomeUiState({
      activeNav: activeNavRef.current,
      search: searchRef.current,
      scrollY: window.scrollY,
    });
    const onScroll = () => {
      syncActiveSection();
      const currentY = Math.max(0, window.scrollY);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = window.setTimeout(() => {
        saveHomeUiState({
          activeNav: activeNavRef.current,
          search: searchRef.current,
          scrollY: currentY,
        });
      }, 140);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', persistCurrentUi);
    syncActiveSection();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', persistCurrentUi);
      if (frame) window.cancelAnimationFrame(frame);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback((nextSearch: string) => {
    searchRef.current = nextSearch;
    saveHomeUiState({ activeNav: activeNavRef.current, search: nextSearch, scrollY: window.scrollY });
  }, []);
  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const runBarcodeLookup = useCallback((barcode: string) => {
    const requestId = ++barcodeLookupRequestIdRef.current;
    setBarcodeLookup({ query: barcode, requestId, records: null });
    void lookupCachedBarcode(barcode).then(({ records, failedSources }) => {
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records, failedSources }
        : current);
    }).catch((error: unknown) => {
      console.error('Không thể tra cứu thông tin cho mã barcode đã quét:', error);
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records: [], error: 'Không thể đọc dữ liệu sản phẩm đã lưu trên thiết bị.' }
        : current);
    });
  }, []);
  const handleBarcodeDetected = useCallback((barcode: string) => {
    cameraLeaseRequestRef.current = null;
    runBarcodeLookup(barcode);
  }, [runBarcodeLookup]);
  const openManualProductLookup = useCallback(() => {
    const requestId = ++barcodeLookupRequestIdRef.current;
    setBarcodeLookup({ query: '', requestId, records: [] });
  }, []);
  const submitManualProductLookup = useCallback(() => {
    if (!barcodeLookup?.query.trim()) return;
    const requestId = ++barcodeLookupRequestIdRef.current;
    const query = barcodeLookup.query.trim();
    setBarcodeLookup({ query, requestId, records: null });
    void searchCachedProducts(query).then(({ records, failedSources }) => {
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records, failedSources }
        : current);
    }).catch((error: unknown) => {
      console.error('Không thể tra cứu sản phẩm từ snapshot:', error);
      setBarcodeLookup((current) => current?.requestId === requestId
        ? { ...current, records: [], error: 'Không thể đọc dữ liệu sản phẩm đã lưu trên thiết bị.' }
        : current);
    });
  }, [barcodeLookup?.query]);
  const closeBarcodeScanner = useCallback(() => {
    cameraLeaseRequestRef.current?.cancel();
    cameraLeaseRequestRef.current = null;
    setScannerMotionOrigin(null);
    setIsBarcodeScannerOpen(false);
  }, []);
  const openBarcodeScanner = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (isBarcodeScannerOpen) return;
    // Begin getUserMedia in the actual dock-button interaction; the mounted
    // scanner will claim this lease as soon as its video element is available.
    cameraLeaseRequestRef.current = requestCameraLease(DEFAULT_SCANNER_CAMERA_REQUEST);
    setScannerMotionOrigin(getMotionOrigin(event.currentTarget));
    void unlockScannerAudio();
    setIsBarcodeScannerOpen(true);
  }, [isBarcodeScannerOpen]);
  const handleNav = useCallback((id: string) => {
    const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (id === 'modules') document.getElementById('modules')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'activity') document.getElementById('activity')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'settings') { setActiveNav('settings'); setShowSettings(true); }
    else if (id === 'home') window.scrollTo({ top: 0, behavior: scrollBehavior });
  }, [prefersReducedMotion]);
  const dockAction = useMemo(() => {
    const scannerAvailable = isScannerSupportedDevice();
    return {
      label: 'Tra cứu nhanh',
      icon: Search,
      onSelect: () => openManualProductLookup(),
      // Desktop opens manual lookup directly. Mobile exposes both sticker actions.
      ...(scannerAvailable ? {
        choices: [
          { id: 'manual-search', label: 'Tìm kiếm', icon: Search, onSelect: () => openManualProductLookup() },
          { id: 'barcode-scan', label: 'Quét mã', icon: ScanBarcode, onSelect: (event: React.MouseEvent<HTMLButtonElement>) => openBarcodeScanner(event) },
        ],
      } : {}),
    };
  }, [openBarcodeScanner, openManualProductLookup]);
  return <>
    <div className={`app-shell home-enter dept-${department.id} dept-motion-${department.motion} ${isEnteringHome ? 'home-enter-active' : ''}`}>
    <main className="home-main">
      <div className="content-wrap home-content">
        <OperationalHome
          employee={employee}
          department={department}
          notices={priorityNotices}
          noticeStatus={snapshotNoticeStatus}
          noticeStatusMessage={snapshotNoticeStatusMessage}
          onOpenModule={(module) => {
            if (module.id === 'stocktake') {
              setIsStocktakeOpen(true);
              return;
            }
            if (module.id === 'stocktake-import') {
              setIsStocktakeImportOpen(true);
              return;
            }
            announce(`${module.title}: giao diện nghiệp vụ đang được tích hợp. Dữ liệu snapshot không đồng nghĩa với workflow đã triển khai.`);
          }}
          onOpenNotice={openNotice}
          onOpenCalendar={openCalendar}
        />

        <HomeModuleLibrarySection
          initialSearch={initialUiState.search}
          onSearchChange={handleSearchChange}
          onOpen={openLibrary}
        />

        <section className="lower-grid" id="activity"><div className="panel-card activity-panel"><div className="panel-heading"><h2 className="icon-section-title" aria-label="Hoạt động"><Activity size={22} aria-hidden="true" /></h2></div><div className="activity-empty"><span className="activity-empty-icon"><Activity size={18} /></span><div><strong>Chưa có hoạt động</strong></div></div></div></section>
        <footer className="app-footer" aria-label="RetailOS"><span className="footer-mark"><BrandMark /></span><b>RetailOS</b><span className="version-pill">0.3</span></footer>
      </div>
    </main>

    </div>
    <LiquidDock
      items={HOME_DOCK_ITEMS.map((item) => item.id === 'settings' ? { ...item, noticeCount: updateNoticeCount } : item)}
      activeId={activeNav}
      onSelect={handleNav}
      action={dockAction}
    />
    {showSettings && <Suspense fallback={<ModuleLoadingSurface title="Cài đặt" onClose={closeSettings} />}><MemoizedSettingsHub onClose={closeSettings} onOpenScannerSettings={openScannerSettings} /></Suspense>}
    {showScannerSettings && <Suspense fallback={<ModuleLoadingSurface title="Cài đặt máy quét" onClose={closeScannerSettings} />}><MemoizedScannerSettingsPanel onClose={closeScannerSettings} /></Suspense>}
    {isBarcodeScannerOpen && <Suspense fallback={<div className="barcode-scanner" role="status">Đang tải máy quét…</div>}><AppErrorBoundary fallback={<section className="barcode-scanner" role="alert"><div className="barcode-scanner-card"><button className="barcode-scanner-close" type="button" aria-label="Đóng máy quét" onClick={closeBarcodeScanner}><X size={19} /></button><p>Máy quét gặp lỗi khi khởi tạo. Hãy đóng và mở lại.</p></div></section>}>
      <MemoizedBarcodeScanner onDetected={handleBarcodeDetected} onClose={closeBarcodeScanner} mode="single" cameraLeaseRequest={cameraLeaseRequestRef.current} motionOrigin={scannerMotionOrigin} />
    </AppErrorBoundary></Suspense>}
    {barcodeLookup && <div className="barcode-result-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) setBarcodeLookup(null);
    }}>
      <section className="barcode-result-card" role="dialog" aria-modal="true" aria-labelledby="barcode-result-title">
        <header className="barcode-result-header">
          <span className={`barcode-result-icon ${barcodeLookup.records && barcodeLookup.records.length > 0 ? 'is-found' : ''}`}>
            {barcodeLookup.records && barcodeLookup.records.length > 0 ? <Check size={21} /> : <ScanBarcode size={21} />}
          </span>
          <div><span className="library-eyebrow">{barcodeLookup.records === null ? 'ĐANG TRA CỨU' : 'TRA CỨU SẢN PHẨM'}</span><h2 id="barcode-result-title">{barcodeLookup.records === null ? 'Đang tìm dữ liệu' : 'Kết quả tra cứu'}</h2></div>
          <button type="button" className="barcode-scanner-close" aria-label="Đóng kết quả" onClick={() => setBarcodeLookup(null)}><X size={19} /></button>
        </header>
        
        <form className="barcode-manual-search" onSubmit={(event) => { event.preventDefault(); submitManualProductLookup(); }}>
          <label htmlFor="barcode-manual-query">Tên sản phẩm hoặc mã barcode</label>
          <div className="barcode-manual-search__field">
            <input id="barcode-manual-query" type="search" value={barcodeLookup.query} placeholder="Nhập tên, một phần tên hoặc mã…" onChange={(event) => setBarcodeLookup((current) => current ? { ...current, query: event.target.value, records: current.records === null ? null : [] , error: undefined, failedSources: undefined } : current)} />
            <button type="submit" disabled={!barcodeLookup.query.trim()}>Tìm</button>
          </div>
        </form>
        {barcodeLookup.records === null
          ? <div className="barcode-lookup-loading" role="status"><span className="barcode-lookup-spinner" /><div><strong>Đang tra cứu snapshot</strong><span>Đối chiếu dữ liệu đã lưu trên thiết bị…</span></div></div>
          : barcodeLookup.records.length > 0
            ? <>
              {barcodeLookup.error && <p className="barcode-result-message" role="alert">{barcodeLookup.error}</p>}
              {barcodeLookup.failedSources && barcodeLookup.failedSources.length > 0 && <p className="barcode-result-message" role="alert">Thiếu snapshot: {barcodeLookup.failedSources.join(', ')}. Kết quả bên dưới có thể chưa đầy đủ.</p>}
              <div className="barcode-result-records">{barcodeLookup.records.map((record, recordIndex) => <section className="barcode-result-record" key={`${record.source}-${recordIndex}`}>
                <h3><PackageSearch size={16} />{record.source}</h3>
                <dl>{record.values.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
              </section>)}</div>
            </>
            : <p className="barcode-result-message" role={barcodeLookup.error || (barcodeLookup.failedSources?.length ?? 0) > 0 ? 'alert' : 'status'}>{barcodeLookup.error ?? (barcodeLookup.failedSources?.length ? `Chưa thể kết luận không có sản phẩm vì thiếu snapshot: ${barcodeLookup.failedSources.join(', ')}.` : barcodeLookup.query.trim() ? 'Không tìm thấy kết quả phù hợp trong snapshot đang lưu trên thiết bị.' : 'Nhập tên sản phẩm hoặc mã barcode để bắt đầu tra cứu.')}</p>}
        <button type="button" className="barcode-result-action" onClick={() => setBarcodeLookup(null)}>Đóng</button>
      </section>
    </div>}
    {showCalendar && <div className={`calendar-modal-backdrop ${isCalendarClosing ? 'calendar-closing' : ''}`} onAnimationEnd={finishCalendarClose} onClick={(event) => { if (event.target === event.currentTarget) closeCalendar(); }}>
      <section className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
        <header className="calendar-modal-header">
          <div className="calendar-modal-title">
            <span className="calendar-modal-icon"><CalendarDays size={20} /></span>
            <div><h2 id="calendar-modal-title">Lịch</h2><p>Chọn ngày để xem lịch</p></div>
          </div>
          <button ref={calendarCloseRef} type="button" className="icon-button" aria-label="Đóng lịch" onClick={closeCalendar}><X size={18} /></button>
        </header>
        <div className="calendar-month-controls">
          <button type="button" className="icon-button" aria-label="Tháng trước" onClick={() => moveCalendarMonth(-1)}><ChevronLeft size={18} /></button>
          <strong>{calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</strong>
          <button type="button" className="icon-button" aria-label="Tháng sau" onClick={() => moveCalendarMonth(1)}><ChevronRight size={18} /></button>
        </div>
        <div className="calendar-month-grid" role="group" aria-label="Lịch tháng">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day} className="calendar-month-weekday">{day}</span>)}
          {calendarMonthDays.map((date) => {
            const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
            const isToday = date.toDateString() === calendarNow.toDateString();
            const isSelected = date.toDateString() === selectedCalendarDate.toDateString();
            return <button
              key={date.toISOString()}
              type="button"
              aria-label={date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              aria-pressed={isSelected}
              className={`calendar-month-day ${isCurrentMonth ? '' : 'outside-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => selectCalendarDate(date)}
            >{date.getDate()}</button>;
          })}
        </div>
        <div className="calendar-agenda">
          <span className="calendar-agenda-date">{selectedCalendarDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <p>Chưa có lịch cho ngày này.</p>
        </div>
      </section>
    </div>}
    {selectedLibrary && (() => {
      const LibraryIcon = getLibraryIcon(selectedLibrary.id);
      return <div className="app-library-backdrop motion-backdrop" data-motion-preset="sheet-backdrop" data-motion-state={isLibraryClosing ? 'exit' : 'enter'} onClick={(event) => { if (event.target === event.currentTarget) closeLibrary(); }}>
        <MotionSheet
          origin={libraryOrigin}
          exiting={isLibraryClosing}
          className={`app-library-modal library-${selectedLibrary.tone}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-library-title"
          onAnimationEnd={finishLibraryClose}
        >
          <header className="app-library-modal-header">
            <div className="app-library-modal-identity">
              <span className="app-library-icon"><MotionIcon icon={LibraryIcon} variant="module" size={22} /></span>
              <div><span className="library-eyebrow">RETAILOS · THƯ VIỆN NGHIỆP VỤ</span><h2 id="app-library-title">{selectedLibrary.title}</h2><p>{selectedLibraryModules.length} chức năng</p></div>
            </div>
            <button ref={libraryCloseButtonRef} type="button" className="icon-button" aria-label="Đóng thư viện" onClick={closeLibrary}><X size={18} /></button>
          </header>
          <div className="app-library-modules">
            {selectedLibraryModules.map((module) => {
              const ModuleIcon = getModuleIcon(module.id);
              return <button key={module.id} type="button" className={`app-library-module module-${module.tone}`} onClick={() => {
                if (module.id === 'stocktake') {
                  setSelectedLibrary(null);
                  setIsStocktakeOpen(true);
                  return;
                }
                if (module.id === 'stocktake-import') {
                  setSelectedLibrary(null);
                  setIsStocktakeImportOpen(true);
                  return;
                }
                announce(`${module.title}: giao diện nghiệp vụ đang được tích hợp. Dữ liệu snapshot và chức năng nghiệp vụ là hai trạng thái riêng biệt.`);
              }}>
                <span className="module-icon"><MotionIcon icon={ModuleIcon} variant="module" size={20} /></span><span className="app-library-module-copy"><strong>{module.title}</strong><small>{module.description}</small><span className="module-availability">{module.availability === 'ready' ? 'Đã triển khai' : 'Đang tích hợp'}</span></span><ArrowUpRight size={16} className="app-library-module-arrow" />
              </button>;
            })}
          </div>
          <p className="app-library-note"><ShieldCheck size={14} /> Trạng thái giao diện và trạng thái snapshot được quản lý riêng</p>
        </MotionSheet>
      </div>;
    })()}
    {selectedNotice && (() => {
      const NoticeIcon = getModuleIcon(selectedNotice.moduleId);
      return <div className={`notice-detail-backdrop ${isNoticeClosing ? 'notice-detail-closing' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) closeNotice(); }}>
        <section className="notice-detail-modal" role="dialog" aria-modal="true" aria-labelledby="notice-detail-title">
          <header className="notice-detail-header">
            <span className={`notice-detail-icon ${selectedNotice.tone}`}><MotionIcon icon={NoticeIcon} variant="module" size={21} /></span>
            <div><span className="notice-detail-kicker">{selectedNotice.category} · SNAPSHOT {new Date(selectedNotice.snapshotDate).toLocaleDateString('vi-VN')}</span><h2 id="notice-detail-title">{selectedNotice.title}</h2></div>
            <button ref={noticeCloseButtonRef} type="button" className="icon-button" aria-label="Đóng bản tin" onClick={closeNotice}><X size={18} /></button>
          </header>
          <div className="notice-detail-content">
            <div className="notice-detail-author"><span className="notice-detail-brand"><BrandMark /></span><span><strong>RetailOS</strong><small>Bản tin ưu tiên</small></span></div>
            <p>{selectedNotice.summary}</p>
            <div className="notice-detail-message">{selectedNotice.details}</div>
          </div>
          <footer className="notice-detail-footer"><ShieldCheck size={15} /><span>Cảnh báo được tính trên snapshot đã lưu trong thiết bị.</span></footer>
        </section>
      </div>;
    })()}
    {isStocktakeOpen && <Suspense fallback={<ModuleLoadingSurface title="Kiểm kê" onClose={closeStocktake} />}><MemoizedStocktakeModule employee={employee} onClose={closeStocktake} /></Suspense>}
    {isStocktakeImportOpen && <Suspense fallback={<ModuleLoadingSurface title="Xuất file kiểm kê" onClose={closeStocktakeImport} />}><MemoizedStocktakeImportModule employee={employee} onClose={closeStocktakeImport} /></Suspense>}
    {toast && <div className="toast-message" role="status"><span className="toast-check"><Check size={16} /></span><span>{toast}</span><button onClick={() => setToast('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}
  </>;
}
