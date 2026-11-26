import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Check, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, CreditCard, Grid2X2, House, LogOut, PackageSearch, ScanBarcode, Search,
  ShieldCheck, Sparkles, Truck, Warehouse, X,
} from 'lucide-react';
import type { EmployeeSession } from '../auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import { Brand, BrandMark } from '../../shared/brand';
import { AppErrorBoundary } from '../../shared/components/AppErrorBoundary';
import { Surface } from '../../shared/components/surface/Surface';
import { readHomeUiState } from './homeStateStore';
import { useHomeSnapshotNotices } from './hooks/useHomeSnapshotNotices';
import { useHomeCalendarClock, useHomeCalendarDates } from './hooks/useHomeCalendarDates';
import { useHomeNavigation } from './hooks/useHomeNavigation';
import { type SnapshotNotice } from './snapshotNoticeRules';
import { useHomeBarcodeLookup } from './hooks/useHomeBarcodeLookup';
import { useHomeFeedback } from './hooks/useHomeFeedback';
import { isScannerSupportedDevice } from '../scanner/services/scannerCapabilities';
import { HomeModuleLibrarySection } from './components/HomeModuleLibrarySection';
import type { ModuleLibraryDefinition, RetailModule } from './moduleRegistry';
import { getDepartmentIcon, getHomeNavigationIcon, getLibraryIcon, getModuleIcon, MotionIcon } from '../../shared/icons';
import { ShellNavigation } from '../../shared/navigation';
import { getMotionOrigin, MOTION_CONFIG, MotionSheet, useMotionState } from '../../shared/motion';
import type { MotionOrigin } from '../../shared/motion';
import '../../styles/home.css';
import '../../styles/home-ux.css';
import '../../styles/home-engine.css';
import '../../styles/home-redesign.css';
import '../../styles/home-architecture.css';
import { useHomePushNotifications } from './hooks/useHomePushNotifications';
import { useHomeUpdateNoticeCount } from './hooks/useHomeUpdateNoticeCount';
import { useHomeSpotlightViewport } from './hooks/useHomeSpotlightViewport';
import { isPushConfigured } from '../notifications/pushNotifications';
import { unlockScannerAudio } from '../scanner/services/scannerAudio';
import { requestCameraLease, type CameraLeaseRequest } from '../../shared/services/cameraSession';
import { DEFAULT_SCANNER_CAMERA_REQUEST } from '../../platform/scanner/contracts';
import { useBodyScrollLock } from '../../shared/hooks/useBodyScrollLock';
import { clearUpdateCenterEntry, readUpdateCenterEntry } from '../../shared/pwa/updateCenterStore';
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
  const DepartmentIcon = getDepartmentIcon(department.id);
  const { prefersReducedMotion } = useMotionState();
  const [initialUiState] = useState(readHomeUiState);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannerMotionOrigin, setScannerMotionOrigin] = useState<MotionOrigin | null>(null);
  const cameraLeaseRequestRef = useRef<CameraLeaseRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const openSettingsFromNavigation = useCallback(() => setShowSettings(true), []);
  const [activeNav, setActiveNav, handleNav, handleSearchChange] = useHomeNavigation({
    initialState: initialUiState,
    prefersReducedMotion,
    onOpenSettings: openSettingsFromNavigation,
  });
  useEffect(() => {
    const openSettings = () => setShowSettings(true);
    window.addEventListener('retailos:open-settings', openSettings);
    return () => window.removeEventListener('retailos:open-settings', openSettings);
  }, []);
  const updateNoticeCount = useHomeUpdateNoticeCount();
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
  const { barcodeLookup, setBarcodeLookup, runBarcodeLookup, openManualProductLookup, submitManualProductLookup } = useHomeBarcodeLookup();
  const { isMobileViewport, areSpotlightNotificationsExpanded, setAreSpotlightNotificationsExpanded } = useHomeSpotlightViewport();
  const calendarNow = useHomeCalendarClock();
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
 
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const calendarCloseRef = useRef<HTMLButtonElement>(null);
  const calendarCloseTimer = useRef<number | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNotificationsClosing, setIsNotificationsClosing] = useState(false);
  const notificationsCloseTimer = useRef<number | null>(null);
  const { priorityNotices, snapshotNoticeStatus } = useHomeSnapshotNotices();
  const { pushSetupStatus, pushSetupError, enablePushNotifications } = useHomePushNotifications();
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
  const { toast, announce, clearToast } = useHomeFeedback();
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


  const { calendarWeek, calendarMonthDays } = useHomeCalendarDates(calendarNow, calendarMonth);

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


  const handleBarcodeDetected = useCallback((barcode: string) => {
    cameraLeaseRequestRef.current = null;
    runBarcodeLookup(barcode);
  }, [runBarcodeLookup]);
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
    <div className={`app-shell has-shell-navigation home-enter dept-${department.id} dept-motion-${department.motion} ${isEnteringHome ? 'home-enter-active' : ''}`}>
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
                  {(pushSetupStatus === 'idle' || pushSetupStatus === 'prompt' || pushSetupStatus === 'error') && <Surface
                    as="button"
                    variant="control"
                    interactive
                    className="push-notification-setup__action ro-button"
                    type="button"
                    onClick={() => { void enablePushNotifications(); }}
                  >
                    <Bell size={15} />
                    {pushSetupStatus === 'prompt' ? 'Thử cấp quyền lại' : pushSetupStatus === 'error' ? 'Thử kết nối lại' : 'Bật thông báo đẩy'}
                  </Surface>}
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
            <button ref={calendarButtonRef} type="button" className="spotlight-tile spotlight-tile-main" aria-label="Mở lịch chi tiết" onClick={openCalendar}>
              <div className="calendar-tile-heading">
                <span className="spotlight-tile-icon"><CalendarDays size={18} /></span>
                <span className="calendar-tile-date"><strong>{calendarNow.getDate()}</strong><small>{calendarNow.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</small></span>
              </div>
              <div className="calendar-week" role="group" aria-label="Các ngày trong tuần">
                {calendarWeek.map(({ date, weekday, day, isToday }) => <span key={date.toISOString()} className={`calendar-day ${isToday ? 'today' : ''}`}><small>{weekday}</small><strong>{day}</strong></span>)}
              </div>
              <span className="calendar-open-hint"><span>Mở lịch</span><ArrowUpRight size={13} /></span>
            </button>
            <div className="spotlight-tile spotlight-tile-float"><span className={`spotlight-dept-icon dept-icon-${department.id}`}><DepartmentIcon size={15} /></span><span>{department.label}</span></div>
            <span className="spotlight-chip"><Sparkles size={13} /> {department.label}</span>
          </div>
        </section>

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
    <ShellNavigation
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
    {toast && <div className="toast-message" role="status"><span className="toast-check"><Check size={16} /></span><span>{toast}</span><button onClick={clearToast} aria-label="Đóng thông báo"><X size={15} /></button></div>}
  </>;
}
