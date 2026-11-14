import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Check, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, CreditCard, Grid2X2, House, LogOut, PackageSearch, ScanBarcode,
  Search, ShieldCheck, Sparkles, Truck, Warehouse, X,
} from 'lucide-react';
import type { EmployeeSession } from '../auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import { Brand, BrandMark } from '../../shared/brand';
import { AppErrorBoundary } from '../../shared/components/AppErrorBoundary';
import { GlassSurface } from '../../shared/components/glass';
import { getCachedModuleSnapshots, MODULE_SNAPSHOTS_UPDATED_EVENT } from '../data/moduleDataService';
import { readHomeUiState, saveHomeUiState } from './homeStateStore';
import { calculateSnapshotNotices, HOME_NOTICE_MODULE_IDS, type SnapshotNotice } from './snapshotNoticeRules';
import { lookupCachedBarcode, type BarcodeProductRecord } from '../scanner/services/barcodeLookup';
import { isScannerSupportedDevice } from '../scanner/services/scannerCapabilities';
import { ModuleLibraryEngine } from './components/ModuleLibraryEngine';
import { MODULE_REGISTRY, MODULE_LIBRARIES, type ModuleLibraryDefinition } from './moduleRegistry';
import { getDepartmentIcon, getHomeNavigationIcon, getLibraryIcon, getModuleIcon, MotionIcon } from '../../shared/icons';
import { LiquidDock } from '../../shared/navigation';
import { getMotionOrigin, MOTION_CONFIG, MotionSheet, useMotionState } from '../../shared/motion';
import type { MotionOrigin } from '../../shared/motion';
import '../../styles/home.css';
import '../../styles/home-ux.css';
import '../../styles/home-engine.css';
import '../../styles/home-redesign.css';
import '../../styles/home-architecture.css';
import { requestDeviceAccess, type DeviceAccessStatus } from '../auth/services/deviceAccess';
import { isPushConfigured, subscribeForPushNotifications } from '../notifications/pushNotifications';
import { unlockScannerAudio } from '../scanner/services/scannerAudio';
import { requestCameraLease, type CameraLeaseRequest } from '../../shared/services/cameraSession';
import { DEFAULT_SCANNER_CAMERA_REQUEST } from '../../platform/scanner/contracts';
import { installScannerDiagnosticCollector } from '../scanner/services/scannerDiagnosticCollector';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';

const BarcodeScanner = lazy(() => import('../scanner/components/BarcodeScanner'));
const StocktakeModule = lazy(() => import('../stocktake/components/StocktakeModule'));
const StocktakeImportModule = lazy(() => import('../stocktake-import/components/StocktakeImportModule'));
const ScannerQaMonitor = lazy(() => import('./components/ScannerQaMonitor'));
const SettingsHub = lazy(() => import('./components/SettingsHub'));
const ScannerSettingsPanel = lazy(() => import('../scanner/components/ScannerSettingsPanel'));

type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  onLogout: () => void;
  isEnteringHome: boolean;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
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
type PushSetupStatus = 'idle' | 'loading' | 'ready' | 'prompt' | 'denied' | 'unsupported' | 'needs-install' | 'error';

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
  employee, department, onLogout, isEnteringHome, isOffline, canInstall, onInstall,
}: Props) {
  const DepartmentIcon = getDepartmentIcon(department.id);
  const { prefersReducedMotion } = useMotionState();
  const initialUiState = useRef(readHomeUiState()).current;
  const [activeNav, setActiveNav] = useState(
    navItems.some((item) => item.id === initialUiState.activeNav && item.id !== 'settings')
      ? initialUiState.activeNav
      : 'home',
  );
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannerMotionOrigin, setScannerMotionOrigin] = useState<MotionOrigin | null>(null);
  const cameraLeaseRequestRef = useRef<CameraLeaseRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScannerQa, setShowScannerQa] = useState(false);
  const [showScannerSettings, setShowScannerSettings] = useState(false);
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setActiveNav('home');
  }, []);
  const openScannerQa = useCallback(() => {
    setShowSettings(false);
    setShowScannerQa(true);
  }, []);
  const closeScannerQa = useCallback(() => {
    setShowScannerQa(false);
    setShowSettings(true);
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
    barcode: string;
    records: BarcodeProductRecord[] | null;
    error?: string;
  } | null>(null);
  const [search, setSearch] = useState(initialUiState.search);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [areSpotlightNotificationsExpanded, setAreSpotlightNotificationsExpanded] = useState(() => !window.matchMedia('(max-width: 700px)').matches);
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
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNotificationsClosing, setIsNotificationsClosing] = useState(false);
  const notificationsCloseTimer = useRef<number | null>(null);
  const [priorityNotices, setPriorityNotices] = useState<SnapshotNotice[]>([]);
  const [snapshotNoticeStatus, setSnapshotNoticeStatus] = useState<SnapshotNoticeStatus>('loading');
  const [pushSetupStatus, setPushSetupStatus] = useState<PushSetupStatus>('idle');
  const [pushSetupError, setPushSetupError] = useState('');
  const [selectedNotice, setSelectedNotice] = useState<SnapshotNotice | null>(null);
  const [isNoticeClosing, setIsNoticeClosing] = useState(false);
  const noticeCloseTimer = useRef<number | null>(null);
  const noticeCloseButtonRef = useRef<HTMLButtonElement>(null);
  const noticeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibraryDefinition | null>(null);
  const [isStocktakeOpen, setIsStocktakeOpen] = useState(false);
  const [isStocktakeImportOpen, setIsStocktakeImportOpen] = useState(false);
  const [libraryOrigin, setLibraryOrigin] = useState<MotionOrigin | undefined>();
  const [isLibraryClosing, setIsLibraryClosing] = useState(false);
  const libraryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const libraryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [toast, setToast] = useState('');
  useBodyScrollLock(
    showCalendar || Boolean(selectedNotice) || Boolean(selectedLibrary)
    || isBarcodeScannerOpen || showSettings || showScannerQa || showScannerSettings
    || isStocktakeOpen || isStocktakeImportOpen || Boolean(barcodeLookup),
  );
  const snapshotNoticeStatusMessage = snapshotNoticeStatus === 'loading'
    ? 'Đang kiểm tra snapshot đã lưu trên thiết bị…'
    : snapshotNoticeStatus === 'empty'
      ? 'Chưa có snapshot trên thiết bị. Cảnh báo sẽ xuất hiện sau khi dữ liệu được đồng bộ.'
      : snapshotNoticeStatus === 'unavailable'
          ? 'Không thể đọc snapshot trên thiết bị; chưa thể xác nhận trạng thái cảnh báo.'
          : 'Không phát hiện cảnh báo trong snapshot đang lưu.';
  const enablePushNotifications = async () => {
    if (pushSetupStatus === 'loading' || pushSetupStatus === 'ready') return;
    setPushSetupStatus('loading');
    setPushSetupError('');
    try {
      const permission: DeviceAccessStatus = await requestDeviceAccess('notifications');
      if (permission !== 'granted') {
        const permissionMessages: Record<DeviceAccessStatus, string> = {
          checking: 'Đang kiểm tra quyền thông báo. Thử lại sau giây lát.',
          prompt: 'Chưa cấp quyền thông báo trên trình duyệt.',
          granted: '',
          denied: 'Quyền thông báo đã bị chặn. Hãy đổi quyền của trang trong cài đặt trình duyệt.',
          unsupported: 'Trình duyệt này không hỗ trợ thông báo đẩy.',
          'needs-install': 'Trên iPhone/iPad, hãy thêm RetailOS vào Màn hình chính để bật thông báo.',
          error: 'Không thể yêu cầu quyền thông báo lúc này.',
        };
        setPushSetupError(permissionMessages[permission]);
        setPushSetupStatus(permission === 'checking' ? 'error' : permission);
        return;
      }
      const result = await subscribeForPushNotifications();
      if (result === 'ready') {
        setPushSetupStatus('ready');
      } else {
        setPushSetupError('Thông báo đẩy chưa được cấu hình.');
        setPushSetupStatus('error');
      }
    } catch (error) {
      console.error('Không thể thiết lập thông báo đẩy theo yêu cầu của người dùng:', error);
      setPushSetupError(error instanceof Error
        ? error.message
        : 'Không thể thiết lập thông báo đẩy lúc này.');
      setPushSetupStatus('error');
    }
  };
  useEffect(() => installScannerDiagnosticCollector(), []);

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
  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 700px)');
    const updateSpotlightForViewport = () => {
      setIsMobileViewport(mobileViewport.matches);
      setAreSpotlightNotificationsExpanded(!mobileViewport.matches);
    };
    mobileViewport.addEventListener('change', updateSpotlightForViewport);
    return () => mobileViewport.removeEventListener('change', updateSpotlightForViewport);
  }, []);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return MODULE_REGISTRY.filter((module) =>
      !query || `${module.title} ${module.description} ${module.group}`.toLocaleLowerCase('vi').includes(query),
    );
  }, [search]);
  const visibleLibraries = useMemo(() => MODULE_LIBRARIES
    .map((library) => ({
      ...library,
      modules: filteredModules.filter((module) => library.moduleIds.includes(module.id)),
    }))
    .filter((library) => library.modules.length > 0), [filteredModules]);
  const selectedLibraryModules = useMemo(
    () => selectedLibrary
      ? filteredModules.filter((module) => selectedLibrary.moduleIds.includes(module.id))
      : [],
    [filteredModules, selectedLibrary],
  );
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

  const closeNotifications = () => {
    if (notificationsCloseTimer.current !== null) return;
    setIsNotificationsClosing(true);
    notificationsCloseTimer.current = window.setTimeout(() => {
      notificationsCloseTimer.current = null;
      setShowNotifications(false);
      setIsNotificationsClosing(false);
    }, 220);
  };
  const openNotice = (notice: SnapshotNotice, trigger: HTMLButtonElement) => {
    noticeTriggerRef.current = trigger;
    if (notificationsCloseTimer.current !== null) window.clearTimeout(notificationsCloseTimer.current);
    notificationsCloseTimer.current = null;
    setShowNotifications(false);
    setIsNotificationsClosing(false);
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
  const openLibrary = useCallback((library: ModuleLibraryDefinition, trigger: HTMLButtonElement) => {
    libraryTriggerRef.current = trigger;
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
  const toggleNotifications = () => {
    if (notificationsCloseTimer.current !== null) {
      window.clearTimeout(notificationsCloseTimer.current);
      notificationsCloseTimer.current = null;
      setIsNotificationsClosing(false);
      setShowNotifications(true);
      return;
    }
    if (showNotifications) {
      closeNotifications();
      return;
    }
    setIsNotificationsClosing(false);
    setShowNotifications(true);
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
      else notificationsButtonRef.current?.focus();
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
    if (notificationsCloseTimer.current !== null) {
      window.clearTimeout(notificationsCloseTimer.current);
      notificationsCloseTimer.current = null;
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
    saveHomeUiState({ activeNav, search, activeFilter: 'Tất cả', scrollY: window.scrollY });
  }, [activeNav, search]);

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

    window.addEventListener('scroll', syncActiveSection, { passive: true });
    syncActiveSection();
    return () => {
      window.removeEventListener('scroll', syncActiveSection);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const persistCurrentUi = () => saveHomeUiState({ activeNav, search, activeFilter: 'Tất cả', scrollY: window.scrollY });
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = window.setTimeout(() => {
        saveHomeUiState({ activeNav, search, activeFilter: 'Tất cả', scrollY: currentY });
      }, 140);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', persistCurrentUi);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', persistCurrentUi);
      if (scrollSaveTimer.current !== null) window.clearTimeout(scrollSaveTimer.current);
    };
  }, [activeNav, search]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const handleBarcodeDetected = (barcode: string) => {
    // Keep the scanner mounted for its short exit transition. The scanner
    // component closes the session immediately and notifies us after motion.
    cameraLeaseRequestRef.current = null;
    setBarcodeLookup({ barcode, records: null });
    void lookupCachedBarcode(barcode).then(({ records, failedSources }) => {
      setBarcodeLookup((current) => current?.barcode === barcode
        ? {
          barcode,
          records,
          error: failedSources.length > 0
            ? `Không thể đọc đầy đủ snapshot từ: ${failedSources.join(', ')}. Kết quả có thể chưa đầy đủ.`
            : undefined,
        }
        : current);
    }).catch((error: unknown) => {
      console.error('Không thể tra cứu thông tin cho mã barcode đã quét:', error);
      setBarcodeLookup((current) => current?.barcode === barcode
        ? { barcode, records: [], error: 'Không thể đọc dữ liệu sản phẩm đã lưu trên thiết bị.' }
        : current);
    });
  };
  const closeBarcodeScanner = () => {
    cameraLeaseRequestRef.current?.cancel();
    cameraLeaseRequestRef.current = null;
    setScannerMotionOrigin(null);
    setIsBarcodeScannerOpen(false);
  };
  const openBarcodeScanner = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (isBarcodeScannerOpen) return;
    // Begin getUserMedia in the actual dock-button interaction; the mounted
    // scanner will claim this lease as soon as its video element is available.
    cameraLeaseRequestRef.current = requestCameraLease(DEFAULT_SCANNER_CAMERA_REQUEST);
    setScannerMotionOrigin(getMotionOrigin(event.currentTarget));
    void unlockScannerAudio();
    setIsBarcodeScannerOpen(true);
  }, []);
  const handleNav = useCallback((id: string) => {
    const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
    if (id === 'modules') document.getElementById('modules')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'activity') document.getElementById('activity')?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    else if (id === 'settings') { setActiveNav('settings'); setShowSettings(true); }
    else if (id === 'home') window.scrollTo({ top: 0, behavior: scrollBehavior });
  }, [prefersReducedMotion]);
  const dockAction = useMemo(() => isScannerSupportedDevice() ? {
    label: 'Quét mã',
    icon: ScanBarcode,
    onSelect: openBarcodeScanner,
  } : undefined, [openBarcodeScanner]);
  return <>
    <div className={`app-shell home-enter dept-${department.id} dept-motion-${department.motion} ${isEnteringHome ? 'home-enter-active' : ''}`}>
    <main className="home-main">
      <header className="topbar home-topbar" id="home">
        <div className="topbar-dock">
          <div className="home-topbar-identity">
            <Brand variant="compact" surface="light" />
            <span className="home-topbar-divider" aria-hidden="true" />
            <div className="topbar-identity-copy">
              <strong>{employee.name}</strong>
              <span><MotionIcon icon={DepartmentIcon} variant="department" size={13} />{department.label}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`topbar-status ${isOffline ? 'offline' : ''}`} role="img" aria-label={isOffline ? 'Ngoại tuyến' : 'Trực tuyến'} title={isOffline ? 'Ngoại tuyến' : 'Trực tuyến'}><i /></span>
            {canInstall && <button className="topbar-action-button install-icon-button" type="button" aria-label="Cài đặt ứng dụng" title="Cài đặt ứng dụng" onClick={onInstall}><ArrowUpRight size={17} /></button>}
            <button
              ref={notificationsButtonRef}
              type="button"
              className={`topbar-action-button notification-button ${priorityNotices.length ? 'has-notices' : 'no-notices'} notice-state-${snapshotNoticeStatus} ${showNotifications && !isNotificationsClosing ? 'selected' : ''}`}
              aria-label={priorityNotices.length
                ? `Thông báo, ${priorityNotices.length} cảnh báo`
                : snapshotNoticeStatus === 'ready'
                  ? 'Thông báo, không phát hiện cảnh báo'
                  : snapshotNoticeStatus === 'empty'
                    ? 'Thông báo, chưa có dữ liệu snapshot'
                    : snapshotNoticeStatus === 'loading'
                      ? 'Thông báo, đang kiểm tra dữ liệu'
                      : 'Thông báo, chưa thể xác định trạng thái cảnh báo'}
              aria-expanded={showNotifications && !isNotificationsClosing}
              onClick={toggleNotifications}
            >
              <MotionIcon icon={Bell} variant="bell" state={showNotifications ? 'active' : 'idle'} />
              {priorityNotices.length > 0 && <i aria-hidden="true" />}
            </button>
            <button className="topbar-action-button topbar-logout" type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={onLogout}><LogOut size={17} /></button>
          </div>
          {showNotifications && <div className={`notification-popover topbar-notification-popover ${isNotificationsClosing ? 'notification-closing' : ''}`}>
            <div className="popover-heading"><strong>Cảnh báo từ dữ liệu</strong><button className="icon-button small" onClick={closeNotifications} aria-label="Đóng"><X size={16} /></button></div>
            {priorityNotices.length === 0
              ? <p className={`notification-empty notification-empty--${snapshotNoticeStatus}`} role="status">{snapshotNoticeStatusMessage}</p>
              : <>
                {snapshotNoticeStatus !== 'ready' && snapshotNoticeStatus !== 'empty' && <p className={`notification-status-notice notification-status-notice--${snapshotNoticeStatus}`} role="status">{snapshotNoticeStatusMessage}</p>}
                {priorityNotices.map((notice) => <button key={notice.id} type="button" className="notification-item notification-item-button" onClick={(event) => openNotice(notice, event.currentTarget)}><span className={`notification-symbol ${notice.tone}`}><MotionIcon icon={getModuleIcon(notice.moduleId)} variant="module" size={18} /></span><span className="notification-item-copy"><strong>{notice.title}</strong><span>{notice.summary}</span></span><ArrowUpRight size={15} className="notification-open-icon" /></button>)}
              </>}
            {isPushConfigured() && <div className="push-notification-setup">
              {pushSetupStatus === 'ready'
                ? <p className="push-notification-setup__status is-ready" role="status"><Check size={15} />Đã đăng ký thông báo đẩy trên thiết bị.</p>
                : <>
                  {pushSetupStatus === 'loading' && <p className="push-notification-setup__status" role="status">Đang thiết lập thông báo đẩy…</p>}
                  {pushSetupStatus === 'denied' && <p className="push-notification-setup__status is-error" role="status">Quyền thông báo đã bị chặn. Hãy đổi quyền của trang trong cài đặt trình duyệt.</p>}
                  {pushSetupStatus === 'unsupported' && <p className="push-notification-setup__status is-error" role="status">Trình duyệt này không hỗ trợ thông báo đẩy.</p>}
                  {pushSetupStatus === 'needs-install' && <p className="push-notification-setup__status" role="status">Trên iPhone/iPad, hãy thêm RetailOS vào Màn hình chính để bật thông báo.</p>}
                  {pushSetupStatus === 'error' && <p className="push-notification-setup__status is-error" role="alert">{pushSetupError}</p>}
                  {(pushSetupStatus === 'idle' || pushSetupStatus === 'prompt' || pushSetupStatus === 'error') && <GlassSurface
                    as="button"
                    material="control"
                    interactive
                    className="push-notification-setup__action ro-button"
                    type="button"
                    onClick={() => { void enablePushNotifications(); }}
                  >
                    <Bell size={15} />
                    {pushSetupStatus === 'prompt' ? 'Thử cấp quyền lại' : pushSetupStatus === 'error' ? 'Thử kết nối lại' : 'Bật thông báo đẩy'}
                  </GlassSurface>}
                </>}
            </div>}
          </div>}
        </div>
      </header>

      {isOffline && <div className="offline-banner"><Activity size={16} aria-hidden="true" /> Ngoại tuyến</div>}

      <div className="content-wrap home-content">
        <section className={`home-spotlight ${areSpotlightNotificationsExpanded || !isMobileViewport ? 'spotlight-notifications-expanded' : ''}`} aria-label="Không gian RetailOS">
          <div className="spotlight-brand-scene" aria-hidden="true">
            <BrandMark />
          </div>
          <div className="spotlight-glow" />
          <div className="spotlight-main-content">
            <div className="spotlight-copy">
              <div className="spotlight-kicker"><span className="spotlight-kicker-mark"><BrandMark /></span> RETAIL OPERATIONS</div>
              <h2>Vận hành<br /><span>thật rõ.</span></h2>
              <p>Công cụ bán lẻ, một không gian làm việc.</p>
              <button className="spotlight-button spotlight-tools-button" type="button" aria-label="Mở thư viện chức năng" title="Thư viện chức năng" onClick={() => { document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <Grid2X2 size={17} /><span>Khám phá chức năng</span><ArrowRight size={15} />
              </button>
            </div>
            <div className="spotlight-notifications hero-notice-panel" aria-label="Cảnh báo từ snapshot">
              <button
                type="button"
                className="spotlight-notifications-heading spotlight-notifications-toggle"
                aria-label={isMobileViewport ? `${areSpotlightNotificationsExpanded ? 'Thu gọn' : 'Mở rộng'} nhóm cảnh báo` : `Cảnh báo từ snapshot, ${priorityNotices.length} cảnh báo`}
                aria-expanded={!isMobileViewport || areSpotlightNotificationsExpanded}
                aria-controls="spotlight-notification-list"
                onClick={() => {
                  if (isMobileViewport) setAreSpotlightNotificationsExpanded((expanded) => !expanded);
                }}
              >
                <Bell size={13} /><span>CẢNH BÁO</span><span className="spotlight-notifications-count">{priorityNotices.length}</span>{priorityNotices.length > 0 && <i />}<ChevronDown className="spotlight-notifications-chevron" size={15} />
              </button>
              <div
                className="spotlight-notification-list"
                id="spotlight-notification-list"
                aria-label="Thông báo ưu tiên"
              >
                {priorityNotices.length === 0 && <div className={`spotlight-notification-empty spotlight-notification-empty--${snapshotNoticeStatus}`} role="status">
                  {snapshotNoticeStatusMessage}
                </div>}
                {priorityNotices.length > 0 && snapshotNoticeStatus !== 'ready' && snapshotNoticeStatus !== 'empty' && <div className={`spotlight-notification-empty spotlight-notification-empty--${snapshotNoticeStatus}`} role="status">{snapshotNoticeStatusMessage}</div>}
                {priorityNotices.map((notice, index) => {
                  const NoticeIcon = getModuleIcon(notice.moduleId);
                  const isCollapsedGroupPreview = isMobileViewport && !areSpotlightNotificationsExpanded && index === 0;
                  return <button
                    key={notice.id}
                    type="button"
                    className={`spotlight-notification ${notice.tone} ${isCollapsedGroupPreview ? 'spotlight-notification-group-preview' : ''}`}
                    aria-label={isCollapsedGroupPreview
                      ? `Mở rộng nhóm cảnh báo, ${priorityNotices.length} cảnh báo`
                      : `Mở cảnh báo: ${notice.title}`}
                    aria-expanded={isCollapsedGroupPreview ? false : undefined}
                    aria-controls={isCollapsedGroupPreview ? 'spotlight-notification-list' : undefined}
                    aria-hidden={isMobileViewport && !areSpotlightNotificationsExpanded && index > 0}
                    onClick={(event) => {
                      if (isCollapsedGroupPreview) {
                        setAreSpotlightNotificationsExpanded(true);
                        return;
                      }
                      openNotice(notice, event.currentTarget);
                    }}
                  >
                    <span className="spotlight-notification-icon"><MotionIcon icon={NoticeIcon} variant="module" size={15} /></span>
                    <span className="spotlight-notification-copy">
                      <span className="spotlight-notification-meta"><strong>RetailOS</strong><span>·</span><span>{notice.category}</span></span>
                      <strong className="spotlight-notification-title">{notice.title}</strong>
                      <span className="spotlight-notification-summary">{notice.summary}</span>
                    </span>
                    <ArrowUpRight size={14} className="spotlight-notification-arrow" />
                  </button>;
                })}
              </div>
            </div>
          </div>
          <div className="spotlight-art hero-calendar-panel">
            <div className="spotlight-orbit orbit-one" />
            <div className="spotlight-orbit orbit-two" />
            <button ref={calendarButtonRef} type="button" className="spotlight-glass-tile spotlight-tile-main" aria-label="Mở lịch chi tiết" onClick={openCalendar}>
              <div className="calendar-tile-heading">
                <span className="spotlight-tile-icon"><CalendarDays size={18} /></span>
                <span className="calendar-tile-date"><strong>{calendarNow.getDate()}</strong><small>{calendarNow.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</small></span>
              </div>
              <div className="calendar-week" role="group" aria-label="Các ngày trong tuần">
                {calendarWeek.map(({ date, weekday, day, isToday }) => <span key={date.toISOString()} className={`calendar-day ${isToday ? 'today' : ''}`}><small>{weekday}</small><strong>{day}</strong></span>)}
              </div>
              <span className="calendar-open-hint"><span>Mở lịch</span><ArrowUpRight size={13} /></span>
            </button>
            <div className="spotlight-glass-tile spotlight-tile-float"><span className={`spotlight-dept-icon dept-icon-${department.id}`}><DepartmentIcon size={15} /></span><span>{department.label}</span></div>
            <span className="spotlight-glass-chip"><Sparkles size={13} /> {department.label}</span>
          </div>
        </section>

        <section className="section-block app-library-section" id="modules">
          <div className="section-heading app-library-heading">
            <div className="module-heading-copy"><span className="library-eyebrow">KHÔNG GIAN CHỨC NĂNG</span><h2>Thư viện nghiệp vụ</h2><p>{filteredModules.length} chức năng trong {visibleLibraries.length} nhóm</p></div>
            <label className="search-field home-search-field" aria-label="Tìm công cụ"><MotionIcon icon={Search} variant="search" active={Boolean(search)} size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm chức năng..." aria-label="Tìm công cụ" />{search && <button className="search-clear-button" type="button" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm"><MotionIcon icon={X} variant="search" active size={15} /></button>}</label>
          </div>
          {visibleLibraries.length > 0 && <ModuleLibraryEngine
            groups={visibleLibraries}
            onOpen={openLibrary}
          />}
          {visibleLibraries.length === 0 && <div className="empty-state app-library-empty"><Search size={22} /><strong>Không có kết quả</strong><span>Thử từ khóa khác.</span></div>}
        </section>

        <section className="lower-grid" id="activity"><div className="panel-card activity-panel"><div className="panel-heading"><h2 className="icon-section-title" aria-label="Hoạt động"><Activity size={22} aria-hidden="true" /></h2></div><div className="activity-empty"><span className="activity-empty-icon"><Activity size={18} /></span><div><strong>Chưa có hoạt động</strong></div></div></div></section>
        <footer className="app-footer" aria-label="RetailOS"><span className="footer-mark"><BrandMark /></span><b>RetailOS</b><span className="version-pill">0.3</span></footer>
      </div>
    </main>

    </div>
    <LiquidDock
      items={HOME_DOCK_ITEMS}
      activeId={activeNav}
      onSelect={handleNav}
      action={dockAction}
    />
    {showSettings && <Suspense fallback={<ModuleLoadingSurface title="Cài đặt" onClose={closeSettings} />}><SettingsHub onClose={closeSettings} onOpenScannerSettings={openScannerSettings} onOpenScannerQa={openScannerQa} /></Suspense>}
    {showScannerQa && <Suspense fallback={<ModuleLoadingSurface title="Scanner QA Monitor" onClose={closeScannerQa} />}><ScannerQaMonitor onClose={closeScannerQa} /></Suspense>}
    {showScannerSettings && <Suspense fallback={<ModuleLoadingSurface title="Cài đặt máy quét" onClose={closeScannerSettings} />}><ScannerSettingsPanel onClose={closeScannerSettings} /></Suspense>}
    {isBarcodeScannerOpen && <Suspense fallback={<div className="barcode-scanner" role="status">Đang tải máy quét…</div>}><AppErrorBoundary fallback={<section className="barcode-scanner" role="alert"><div className="barcode-scanner-card"><button className="barcode-scanner-close" type="button" aria-label="Đóng máy quét" onClick={closeBarcodeScanner}><X size={19} /></button><p>Máy quét gặp lỗi khi khởi tạo. Hãy đóng và mở lại.</p></div></section>}>
      <BarcodeScanner onDetected={handleBarcodeDetected} onClose={closeBarcodeScanner} mode="single" cameraLeaseRequest={cameraLeaseRequestRef.current} motionOrigin={scannerMotionOrigin} />
    </AppErrorBoundary></Suspense>}
    {barcodeLookup && <div className="barcode-result-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) setBarcodeLookup(null);
    }}>
      <section className="barcode-result-card" role="dialog" aria-modal="true" aria-labelledby="barcode-result-title">
        <header className="barcode-result-header">
          <span className={`barcode-result-icon ${barcodeLookup.records && barcodeLookup.records.length > 0 ? 'is-found' : ''}`}>
            {barcodeLookup.records && barcodeLookup.records.length > 0 ? <Check size={21} /> : <ScanBarcode size={21} />}
          </span>
          <div><span className="library-eyebrow">{barcodeLookup.records === null ? 'ĐANG TRA CỨU' : 'TRA CỨU SẢN PHẨM'}</span><h2 id="barcode-result-title">{barcodeLookup.records === null ? 'Đang tìm dữ liệu' : 'Kết quả quét mã'}</h2></div>
          <button type="button" className="barcode-scanner-close" aria-label="Đóng kết quả" onClick={() => setBarcodeLookup(null)}><X size={19} /></button>
        </header>
        <ol className="barcode-flow-steps" aria-label="Tiến trình quét barcode">
          <li className="is-complete"><span>01</span>Quét mã</li>
          <li className={barcodeLookup.records === null ? 'is-active' : 'is-complete'}><span>02</span>Tra cứu</li>
          <li className={barcodeLookup.records !== null ? 'is-active' : ''}><span>03</span>Kết quả</li>
        </ol>
        <div className="barcode-result-code"><span>Mã barcode</span><strong>{barcodeLookup.barcode}</strong></div>
        {barcodeLookup.records === null
          ? <div className="barcode-lookup-loading" role="status"><span className="barcode-lookup-spinner" /><div><strong>Đang tra cứu snapshot</strong><span>Đối chiếu dữ liệu đã lưu trên thiết bị…</span></div></div>
          : barcodeLookup.records.length > 0
            ? <>
              {barcodeLookup.error && <p className="barcode-result-message" role="alert">{barcodeLookup.error}</p>}
              <div className="barcode-result-records">{barcodeLookup.records.map((record, recordIndex) => <section className="barcode-result-record" key={`${record.source}-${recordIndex}`}>
                <h3><PackageSearch size={16} />{record.source}</h3>
                <dl>{record.values.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
              </section>)}</div>
            </>
            : <p className="barcode-result-message" role={barcodeLookup.error ? 'alert' : 'status'}>{barcodeLookup.error ?? 'Không tìm thấy mã này trong snapshot sản phẩm đang lưu trên thiết bị.'}</p>}
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
    {isStocktakeOpen && <Suspense fallback={<ModuleLoadingSurface title="Kiểm kê" onClose={() => setIsStocktakeOpen(false)} />}><StocktakeModule employee={employee} onClose={() => setIsStocktakeOpen(false)} /></Suspense>}
    {isStocktakeImportOpen && <Suspense fallback={<ModuleLoadingSurface title="Xuất file kiểm kê" onClose={() => setIsStocktakeImportOpen(false)} />}><StocktakeImportModule employee={employee} onClose={() => setIsStocktakeImportOpen(false)} /></Suspense>}
    {toast && <div className="toast-message" role="status"><span className="toast-check"><Check size={16} /></span><span>{toast}</span><button onClick={() => setToast('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}
  </>;
}
