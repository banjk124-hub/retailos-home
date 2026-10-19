import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Boxes, ChartNoAxesCombined, Check, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Command, CreditCard, Grid2X2, House, LifeBuoy, LogOut, Moon, Monitor, PackageSearch, ScanBarcode, Sun,
  Search, ShieldCheck, SlidersHorizontal, Sparkles, Truck, UserRound, Warehouse, X,
} from 'lucide-react';
import type { EmployeeSession } from '../auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import type { AppearancePreference } from '../../shared/hooks/useAdaptiveAppearance';
import { Brand } from '../../shared/components/Brand';
import { getCachedModuleSnapshot, MODULE_DATA_IDS, MODULE_SNAPSHOTS_UPDATED_EVENT, type ModuleDataId } from '../data/moduleDataService';
import { readHomeUiState, saveHomeUiState } from './homeStateStore';
import { calculateSnapshotNotices, type SnapshotNotice } from './snapshotNoticeRules';
import { lookupCachedBarcode, type BarcodeProductRecord } from '../scanner/services/barcodeLookup';
import { getCameraErrorMessage } from '../scanner/services/cameraErrors';

const loadBarcodeScanner = () => import('../scanner/components/BarcodeScanner');
const BarcodeScanner = lazy(loadBarcodeScanner);
const supermarketScenes = ['market-morning.svg', 'market-fresh.svg', 'market-evening.svg'];

type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  onLogout: () => void;
  isEnteringHome: boolean;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
  appearancePreference: AppearancePreference;
  isLowPowerMode: boolean;
  onCycleAppearance: () => void;
};
type Module = { id: ModuleDataId; title: string; description: string; icon: typeof Warehouse; tone: string; group: string; status?: string };
type ModuleLibrary = { id: string; title: string; description: string; icon: typeof Warehouse; tone: string; moduleIds: ModuleDataId[] };
type SnapshotNoticeStatus = 'loading' | 'ready' | 'empty' | 'partial' | 'unavailable';

const modules: Module[] = [
  { id: 'inventory', title: 'Tồn kho', description: 'Tồn thực tế & định mức', icon: Warehouse, tone: 'blue', group: 'Kiểm soát hàng hóa', status: 'Snapshot' },
  { id: 'price', title: 'Giá & vốn', description: 'Giá bán và giá vốn', icon: CreditCard, tone: 'violet', group: 'Kiểm soát hàng hóa', status: 'Snapshot' },
  { id: 'products', title: 'Danh mục hàng hóa', description: 'Tra cứu tên và barcode', icon: PackageSearch, tone: 'cyan', group: 'Kiểm soát hàng hóa', status: 'Snapshot' },
  { id: 'orders', title: 'Nhập / xuất hàng', description: 'Luồng xử lý hàng hóa', icon: ClipboardList, tone: 'amber', group: 'Xử lý hàng hóa', status: 'Snapshot' },
  { id: 'delivery', title: 'Điều chuyển hàng', description: 'Tuyến và giao nhận', icon: Truck, tone: 'rose', group: 'Xử lý hàng hóa', status: 'Snapshot' },
  { id: 'sales', title: 'Doanh số', description: 'Kết quả và mục tiêu bán hàng', icon: Activity, tone: 'green', group: 'Doanh số', status: 'Snapshot' },
  { id: 'product-dates', title: 'Date sản phẩm', description: 'Hạn sử dụng và lô hàng', icon: CalendarDays, tone: 'amber', group: 'Date sản phẩm', status: 'Snapshot' },
  { id: 'stocktake', title: 'Kiểm kê', description: 'Chênh lệch và tiến độ kiểm kê', icon: Check, tone: 'green', group: 'Kiểm kê', status: 'Snapshot' },
];
const moduleLibraries: ModuleLibrary[] = [
  { id: 'goods-control', title: 'Kiểm soát hàng hóa', description: 'Tồn kho, giá và danh mục', icon: Warehouse, tone: 'blue', moduleIds: ['inventory', 'price', 'products'] },
  { id: 'goods-processing', title: 'Xử lý hàng hóa', description: 'Nhập, xuất và điều chuyển', icon: Truck, tone: 'amber', moduleIds: ['orders', 'delivery'] },
  { id: 'sales', title: 'Doanh số', description: 'Kết quả và mục tiêu bán hàng', icon: Activity, tone: 'green', moduleIds: ['sales'] },
  { id: 'product-dates', title: 'Date sản phẩm', description: 'Theo dõi hạn sử dụng', icon: CalendarDays, tone: 'rose', moduleIds: ['product-dates'] },
  { id: 'stocktake', title: 'Kiểm kê', description: 'Tiến độ và chênh lệch', icon: Check, tone: 'violet', moduleIds: ['stocktake'] },
];
const navItems = [
  { id: 'home', label: 'Trang chủ', icon: House },
  { id: 'modules', label: 'Module', icon: Boxes },
  { id: 'activity', label: 'Hoạt động', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Cài đặt', icon: SlidersHorizontal },
];

export default function HomeScreen({
  employee, department, onLogout, isEnteringHome, isOffline, canInstall, onInstall,
  appearancePreference, isLowPowerMode, onCycleAppearance,
}: Props) {
  const DepartmentIcon = department.icon;
  const initialUiState = useRef(readHomeUiState()).current;
  const [activeNav, setActiveNav] = useState(initialUiState.activeNav);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeStream, setBarcodeStream] = useState<MediaStream | null>(null);
  const [barcodeCameraError, setBarcodeCameraError] = useState('');
  const barcodeRequestIdRef = useRef(0);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const [barcodeLookup, setBarcodeLookup] = useState<{
    barcode: string;
    records: BarcodeProductRecord[] | null;
    error?: string;
  } | null>(null);
  const [search, setSearch] = useState(initialUiState.search);
  const [isChromeIdle, setIsChromeIdle] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [areSpotlightNotificationsExpanded, setAreSpotlightNotificationsExpanded] = useState(() => !window.matchMedia('(max-width: 700px)').matches);
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  const supermarketSceneUrl = useMemo(() => {
    const today = new Date(calendarNow.getFullYear(), calendarNow.getMonth(), calendarNow.getDate());
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((today.getTime() - yearStart.getTime()) / 86_400_000);
    const scene = supermarketScenes[dayOfYear % supermarketScenes.length];
    return `${import.meta.env.BASE_URL}supermarket-scenes/${scene}`;
  }, [calendarNow]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
  const scrollSaveTimer = useRef<number | null>(null);
  const chromeIdleTimer = useRef<number | null>(null);
  const isChromeIdleRef = useRef(false);
  const lastWheelActivityRef = useRef(0);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const calendarCloseRef = useRef<HTMLButtonElement>(null);
  const calendarCloseTimer = useRef<number | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isNotificationsClosing, setIsNotificationsClosing] = useState(false);
  const notificationsCloseTimer = useRef<number | null>(null);
  const [priorityNotices, setPriorityNotices] = useState<SnapshotNotice[]>([]);
  const [snapshotNoticeStatus, setSnapshotNoticeStatus] = useState<SnapshotNoticeStatus>('loading');
  const [selectedNotice, setSelectedNotice] = useState<SnapshotNotice | null>(null);
  const [isNoticeClosing, setIsNoticeClosing] = useState(false);
  const noticeCloseTimer = useRef<number | null>(null);
  const noticeCloseButtonRef = useRef<HTMLButtonElement>(null);
  const noticeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibrary | null>(null);
  const [isLibraryClosing, setIsLibraryClosing] = useState(false);
  const libraryCloseTimer = useRef<number | null>(null);
  const libraryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const libraryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const libraryTrackRef = useRef<HTMLDivElement>(null);
  const libraryDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean; holdTimer: number | null } | null>(null);
  const suppressLibraryClickRef = useRef(false);
  const [activeLibraryPage, setActiveLibraryPage] = useState(0);
  const [toast, setToast] = useState('');
  const snapshotNoticeStatusMessage = snapshotNoticeStatus === 'loading'
    ? 'Đang kiểm tra snapshot đã lưu trên thiết bị…'
    : snapshotNoticeStatus === 'empty'
      ? 'Chưa có snapshot trên thiết bị. Cảnh báo sẽ xuất hiện sau khi dữ liệu được đồng bộ.'
      : snapshotNoticeStatus === 'partial'
        ? 'Không đọc được đầy đủ snapshot; danh sách cảnh báo có thể chưa đầy đủ.'
        : snapshotNoticeStatus === 'unavailable'
          ? 'Không thể đọc snapshot trên thiết bị; chưa thể xác nhận trạng thái cảnh báo.'
          : 'Không phát hiện cảnh báo trong snapshot đang lưu.';
  useEffect(() => {
    void loadBarcodeScanner().catch((error: unknown) => {
      console.error('Không thể tải trước máy quét barcode:', error);
    });
  }, []);
  useEffect(() => () => {
    barcodeRequestIdRef.current += 1;
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    const holdTimer = libraryDragRef.current?.holdTimer;
    if (holdTimer !== null && holdTimer !== undefined) window.clearTimeout(holdTimer);
    libraryDragRef.current = null;
  }, []);
  useEffect(() => {
    if (!isBarcodeScannerOpen) return;
    const stopCameraForBackground = () => {
      barcodeRequestIdRef.current += 1;
      barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
      barcodeStreamRef.current = null;
      setBarcodeStream(null);
      setBarcodeCameraError('Camera đã tạm dừng khi ứng dụng chuyển nền. Chạm “Thử lại” để tiếp tục quét.');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopCameraForBackground();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopCameraForBackground);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopCameraForBackground);
    };
  }, [isBarcodeScannerOpen]);
  useEffect(() => {
    let isCurrent = true;
    const loadSnapshotNotices = async () => {
      setSnapshotNoticeStatus('loading');
      const results = await Promise.allSettled(MODULE_DATA_IDS.map(getCachedModuleSnapshot));
      if (!isCurrent) return;
      const snapshots = results.flatMap((result) => {
        if (result.status === 'fulfilled') return result.value ? [result.value] : [];
        return [];
      });
      const failedCount = results.filter((result) => result.status === 'rejected').length;
      const cacheError = results.find((result) => result.status === 'rejected');
      if (cacheError?.status === 'rejected') {
        console.error('Không thể đọc một hoặc nhiều snapshot để tính thông báo:', cacheError.reason);
      }
      setPriorityNotices(calculateSnapshotNotices(snapshots));
      setSnapshotNoticeStatus(failedCount === results.length
        ? 'unavailable'
        : failedCount > 0
          ? 'partial'
          : snapshots.length === 0
            ? 'empty'
            : 'ready');
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
    return modules.filter((module) => !query || `${module.title} ${module.description} ${module.group}`.toLocaleLowerCase('vi').includes(query));
  }, [search]);
  const visibleLibraries = useMemo(() => moduleLibraries
    .map((library) => ({ ...library, modules: filteredModules.filter((module) => library.moduleIds.includes(module.id)) }))
    .filter((library) => library.modules.length > 0), [filteredModules]);
  useEffect(() => {
    setActiveLibraryPage(0);
    libraryTrackRef.current?.scrollTo({ left: 0 });
  }, [search]);
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
    const updateCalendar = () => setCalendarNow(new Date());
    const interval = window.setInterval(updateCalendar, 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
  const openLibrary = (library: ModuleLibrary, trigger: HTMLButtonElement) => {
    libraryTriggerRef.current = trigger;
    setIsLibraryClosing(false);
    setSelectedLibrary(library);
  };
  const closeLibrary = () => {
    if (libraryCloseTimer.current !== null) return;
    setIsLibraryClosing(true);
    libraryCloseTimer.current = window.setTimeout(() => {
      libraryCloseTimer.current = null;
      setSelectedLibrary(null);
      setIsLibraryClosing(false);
    }, 220);
  };
  const goToLibraryPage = (index: number) => {
    const track = libraryTrackRef.current;
    const page = track?.querySelectorAll<HTMLElement>('[data-library-page]')[index];
    if (!track || !page) return;
    track.scrollTo({
      left: track.scrollLeft + page.getBoundingClientRect().left - track.getBoundingClientRect().left,
      behavior: 'smooth',
    });
    setActiveLibraryPage(index);
  };
  const updateActiveLibraryPage = () => {
    const track = libraryTrackRef.current;
    if (!track) return;
    const trackLeft = track.getBoundingClientRect().left;
    const pages = Array.from(track.querySelectorAll<HTMLElement>('[data-library-page]'));
    const closestPage = pages.reduce((closest, page, index) => {
      const distance = Math.abs(page.getBoundingClientRect().left - trackLeft);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Number.POSITIVE_INFINITY });
    setActiveLibraryPage((current) => current === closestPage.index ? current : closestPage.index);
  };
  const startLibraryDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const track = event.currentTarget;
    const drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: track.scrollLeft,
      moved: false,
      holdTimer: window.setTimeout(() => track.classList.add('is-pointer-held'), 260),
    };
    libraryDragRef.current = drag;
    track.setPointerCapture(event.pointerId);
  };
  const moveLibraryDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = libraryDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 6) return;
    drag.moved = true;
    if (drag.holdTimer !== null) window.clearTimeout(drag.holdTimer);
    event.currentTarget.classList.add('is-pointer-dragging');
    event.currentTarget.scrollLeft = drag.startScrollLeft - distance;
    event.preventDefault();
  };
  const finishLibraryDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = libraryDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.holdTimer !== null) window.clearTimeout(drag.holdTimer);
    const track = event.currentTarget;
    track.classList.remove('is-pointer-held', 'is-pointer-dragging');
    libraryDragRef.current = null;
    if (drag.moved) {
      suppressLibraryClickRef.current = true;
      window.setTimeout(() => { suppressLibraryClickRef.current = false; }, 0);
    }
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
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
    const previousOverflow = document.body.style.overflow;
    calendarCloseRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCalendar();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      calendarButtonRef.current?.focus();
    };
  }, [showCalendar]);

  useEffect(() => {
    if (!selectedNotice) return;
    const previousOverflow = document.body.style.overflow;
    noticeCloseButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNotice();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      if (noticeTriggerRef.current?.isConnected) noticeTriggerRef.current.focus();
      else notificationsButtonRef.current?.focus();
    };
  }, [selectedNotice]);

  useEffect(() => {
    if (!selectedLibrary) return;
    const previousOverflow = document.body.style.overflow;
    libraryCloseButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLibrary();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
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
    if (libraryCloseTimer.current !== null) {
      window.clearTimeout(libraryCloseTimer.current);
      libraryCloseTimer.current = null;
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

  useEffect(() => {
    const scheduleChromeHide = (event?: Event) => {
      if (event?.type === 'wheel') {
        const now = performance.now();
        if (now - lastWheelActivityRef.current < 250) return;
        lastWheelActivityRef.current = now;
      }
      if (isChromeIdleRef.current) {
        isChromeIdleRef.current = false;
        setIsChromeIdle(false);
      }
      if (chromeIdleTimer.current !== null) window.clearTimeout(chromeIdleTimer.current);
      chromeIdleTimer.current = window.setTimeout(() => {
        isChromeIdleRef.current = true;
        setIsChromeIdle(true);
      }, 3500);
    };
    const interactionEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel'];
    interactionEvents.forEach((eventName) => window.addEventListener(eventName, scheduleChromeHide, { passive: eventName !== 'keydown' }));
    scheduleChromeHide();
    return () => {
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, scheduleChromeHide));
      if (chromeIdleTimer.current !== null) window.clearTimeout(chromeIdleTimer.current);
    };
  }, []);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const handleBarcodeDetected = (barcode: string) => {
    barcodeRequestIdRef.current += 1;
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    setBarcodeStream(null);
    setIsBarcodeScannerOpen(false);
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
    barcodeRequestIdRef.current += 1;
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    setBarcodeStream(null);
    setBarcodeCameraError('');
    setIsBarcodeScannerOpen(false);
  };
  const openBarcodeScanner = () => {
    setIsBarcodeScannerOpen(true);
    setBarcodeCameraError('');
    setBarcodeStream(null);
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;

    const requestId = ++barcodeRequestIdRef.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setBarcodeCameraError('Camera chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ bảo mật rồi thử lại.');
        return;
    }

    try {
        // Request camera synchronously from the user gesture; some mobile browsers reject effect-triggered prompts.
        void navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        }).then((stream) => {
          if (requestId !== barcodeRequestIdRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          barcodeStreamRef.current = stream;
          setBarcodeStream(stream);
        }).catch((error: unknown) => {
          if (requestId === barcodeRequestIdRef.current) setBarcodeCameraError(getCameraErrorMessage(error));
        });
    } catch (error) {
        setBarcodeCameraError(getCameraErrorMessage(error));
    }
  };
  const handleNav = (id: string) => {
    setActiveNav(id);
    if (id === 'modules') document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (id === 'activity') document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (id === 'settings') announce('Thiết lập và phân quyền sẽ được cấu hình ở bước tiếp theo.');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return <>
    <div className={`app-shell home-enter dept-${department.id} dept-motion-${department.motion} ${isEnteringHome ? 'home-enter-active' : ''}`}>
    <aside className="sidebar">
      <Brand />
      <div className="workspace-switcher"><div className="workspace-avatar">RO</div><div className="workspace-copy"><strong>RetailOS</strong><span>Không gian làm việc</span></div><ChevronRight size={16} className="muted-icon" /></div>
      <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="side-nav" aria-label="Điều hướng chính">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`side-nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => handleNav(item.id)}><Icon size={18} /><span>{item.label}</span>{item.id === 'activity' && <span className="nav-dot" />}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><LifeBuoy size={18} /></div><div><strong>Cần hỗ trợ?</strong><span>Trung tâm trợ giúp</span></div><ArrowRight size={15} /></div><div className="profile-row"><div className={`profile-avatar dept-profile-avatar dept-icon-${department.id}`}><DepartmentIcon size={17} /></div><div className="profile-copy"><strong>{employee.name}</strong><span>{employee.department}</span></div><button className="icon-button small" aria-label="Đăng xuất" onClick={onLogout}><LogOut size={17} /></button></div></div>
    </aside>

    <main className="main-area">
      <header className={`topbar ${isChromeIdle ? 'chrome-hidden' : ''}`} id="home">
        <div className="topbar-dock">
          <div className="topbar-identity">
            <span className="topbar-brand-mark"><Command size={17} /></span>
            <div className="topbar-identity-copy">
              <strong>Xin chào, {employee.name.split(/\s+/).slice(-1)[0]}</strong>
              <span><DepartmentIcon size={12} />{department.label}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`topbar-status ${isOffline ? 'offline' : ''}`} role="img" aria-label={isOffline ? 'Ngoại tuyến' : 'Trực tuyến'} title={isOffline ? 'Ngoại tuyến' : 'Trực tuyến'}><i /></span>
            {canInstall && <button className="topbar-action-button install-icon-button" type="button" aria-label="Cài đặt ứng dụng" title="Cài đặt ứng dụng" onClick={onInstall}><ArrowUpRight size={17} /></button>}
            <button
              className="topbar-action-button appearance-button"
              type="button"
              aria-label={`Giao diện ${appearancePreference === 'system' ? 'theo thiết bị' : appearancePreference === 'dark' ? 'tối' : 'sáng'}. Chạm để đổi chế độ`}
              title={`${appearancePreference === 'system' ? 'Theo thiết bị' : appearancePreference === 'dark' ? 'Tối' : 'Sáng'}${isLowPowerMode ? ' · Tiết kiệm hiệu ứng' : ''}`}
              onClick={onCycleAppearance}
            >
              {appearancePreference === 'system' ? <Monitor size={17} /> : appearancePreference === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
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
              <Bell size={18} />
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
                {priorityNotices.map((notice) => { const Icon = notice.icon; return <button key={notice.id} type="button" className="notification-item notification-item-button" onClick={(event) => openNotice(notice, event.currentTarget)}><span className={`notification-symbol ${notice.tone}`}><Icon size={18} /></span><span className="notification-item-copy"><strong>{notice.title}</strong><span>{notice.summary}</span></span><ArrowUpRight size={15} className="notification-open-icon" /></button>; })}
              </>}
          </div>}
        </div>
      </header>

      {isOffline && <div className="offline-banner"><Activity size={16} aria-hidden="true" /> Ngoại tuyến</div>}

      <div className="content-wrap">
        <section className={`home-spotlight ${areSpotlightNotificationsExpanded || !isMobileViewport ? 'spotlight-notifications-expanded' : ''}`} aria-label="Không gian RetailOS">
          <img key={supermarketSceneUrl} className="spotlight-supermarket-scene" src={supermarketSceneUrl} alt="" aria-hidden="true" />
          <div className="spotlight-glow" />
          <div className="spotlight-main-content">
            <div className="spotlight-copy">
              <div className="spotlight-kicker">RETAILOS</div>
              <h2>Vận hành<br />thật rõ.</h2>
              <p>Công cụ bán lẻ, một nơi.</p>
              <button className="spotlight-button spotlight-tools-button" aria-label="Mở thư viện chức năng" title="Thư viện chức năng" onClick={() => { document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <Grid2X2 size={18} />
              </button>
            </div>
            <div className="spotlight-notifications" aria-label="Cảnh báo từ snapshot">
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
                  const Icon = notice.icon;
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
                    <span className="spotlight-notification-icon"><Icon size={15} /></span>
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
          <div className="spotlight-art">
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
            <span className="spotlight-glass-chip"><Sparkles size={13} /> WORKSPACE</span>
          </div>
        </section>

        <section className="section-block app-library-section" id="modules">
          <div className="section-heading app-library-heading">
            <div><span className="library-eyebrow">KHÔNG GIAN CHỨC NĂNG</span><h2>Thư viện</h2><p>{filteredModules.length} công cụ · Vuốt ngang để khám phá</p></div>
            <label className="search-field" aria-label="Tìm công cụ"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm..." aria-label="Tìm công cụ" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm"><X size={14} /></button>}</label>
          </div>
          {visibleLibraries.length > 0 && <div className="app-library-pages">
            <div className="app-library-page-controls" aria-label="Điều hướng thư viện">
              <span className="app-library-page-count"><strong>{String(activeLibraryPage + 1).padStart(2, '0')}</strong><span>/</span>{String(visibleLibraries.length).padStart(2, '0')}</span>
              <div className="app-library-page-dots" role="group" aria-label="Chọn trang thư viện">
                {visibleLibraries.map((library, index) => <button
                  key={library.id}
                  type="button"
                  aria-label={`Trang ${index + 1}: ${library.title}`}
                  aria-current={activeLibraryPage === index ? 'page' : undefined}
                  className={activeLibraryPage === index ? 'active' : ''}
                  onClick={() => goToLibraryPage(index)}
                />)}
              </div>
              <div className="app-library-page-arrows">
                <button type="button" aria-label="Thư viện trước" disabled={activeLibraryPage === 0} onClick={() => goToLibraryPage(activeLibraryPage - 1)}><ChevronLeft size={17} /></button>
                <button type="button" aria-label="Thư viện tiếp theo" disabled={activeLibraryPage >= visibleLibraries.length - 1} onClick={() => goToLibraryPage(activeLibraryPage + 1)}><ChevronRight size={17} /></button>
              </div>
            </div>
            <div
              ref={libraryTrackRef}
              className="app-library-track"
              role="region"
              aria-label="Thư viện chức năng, vuốt ngang để xem thêm"
              tabIndex={0}
              onScroll={updateActiveLibraryPage}
              onPointerDown={startLibraryDrag}
              onPointerMove={moveLibraryDrag}
              onPointerUp={finishLibraryDrag}
              onPointerCancel={finishLibraryDrag}
              onLostPointerCapture={finishLibraryDrag}
              onClickCapture={(event) => {
                if (!suppressLibraryClickRef.current) return;
                suppressLibraryClickRef.current = false;
                event.preventDefault();
                event.stopPropagation();
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  goToLibraryPage(Math.max(0, activeLibraryPage - 1));
                } else if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  goToLibraryPage(Math.min(visibleLibraries.length - 1, activeLibraryPage + 1));
                }
              }}
            >
            {visibleLibraries.map((library, index) => {
              const LibraryIcon = library.icon;
              return <button
                key={library.id}
                type="button"
                data-library-page
                className={`app-library-card app-library-page-card ${activeLibraryPage === index ? 'is-active' : ''} library-${library.tone}`}
                style={{ '--library-index': index } as React.CSSProperties}
                aria-label={`Mở thư viện ${library.title}, ${library.modules.length} chức năng`}
                onClick={(event) => openLibrary(library, event.currentTarget)}
              >
                <span className="app-library-card-top"><span className="app-library-icon"><LibraryIcon size={22} /></span><span className="app-library-count"><span>PAGE {String(index + 1).padStart(2, '0')}</span>{library.modules.length} chức năng</span></span>
                <span className="app-library-card-title">{library.title}</span>
                <span className="app-library-description">{library.description}</span>
                <span className="app-library-page-modules">{library.modules.map((module) => { const Icon = module.icon; return <span key={module.id}><Icon size={14} />{module.title}</span>; })}</span>
                <span className="app-library-card-footer"><span>Mở thư viện</span><ArrowUpRight size={16} /></span>
              </button>;
            })}
            </div>
          </div>
          }
          {visibleLibraries.length === 0 && <div className="empty-state app-library-empty"><Search size={22} /><strong>Không có kết quả</strong><span>Thử từ khóa khác.</span></div>}
        </section>

        <section className="lower-grid" id="activity"><div className="panel-card activity-panel"><div className="panel-heading"><h2 className="icon-section-title" aria-label="Hoạt động"><Activity size={22} aria-hidden="true" /></h2></div><div className="activity-empty"><span className="activity-empty-icon"><Activity size={18} /></span><div><strong>Chưa có hoạt động</strong></div></div></div></section>
        <footer className="app-footer" aria-label="RetailOS"><span className="footer-mark"><Command size={14} /></span><b>RetailOS</b><span className="version-pill">0.3</span></footer>
      </div>
    </main>

    </div>
    <nav className={`mobile-nav ${isChromeIdle ? 'chrome-hidden' : ''}`} aria-label="Điều hướng di động">
      {navItems.slice(0, 2).map((item, index) => {
        const Icon = item.icon;
        return <button key={item.id} type="button" title={item.label} aria-label={item.label} style={{ '--nav-index': index } as React.CSSProperties} className={activeNav === item.id ? 'active' : ''} onClick={() => handleNav(item.id)}><span className="mobile-nav-icon"><Icon size={23} strokeWidth={2.1} /></span><span aria-hidden="true">{item.label}</span></button>;
      })}
      <button type="button" className="barcode-nav-item" title="Quét barcode" aria-label="Mở máy quét barcode" onClick={openBarcodeScanner}><span className="mobile-nav-icon"><ScanBarcode size={27} strokeWidth={2.1} /></span><span aria-hidden="true">Quét mã</span></button>
      {navItems.slice(2).map((item, index) => {
        const Icon = item.icon;
        return <button key={item.id} type="button" title={item.label} aria-label={item.label} style={{ '--nav-index': index + 3 } as React.CSSProperties} className={activeNav === item.id ? 'active' : ''} onClick={() => handleNav(item.id)}><span className="mobile-nav-icon"><Icon size={23} strokeWidth={2.1} /></span><span aria-hidden="true">{item.label}</span></button>;
      })}
    </nav>
    {isBarcodeScannerOpen && <Suspense fallback={<section className="barcode-scanner" role="status"><div className="barcode-scanner-card"><button className="barcode-scanner-close" type="button" aria-label="Đóng máy quét" onClick={closeBarcodeScanner}><X size={19} /></button><p>Đang tải máy quét barcode…</p></div></section>}>
      <BarcodeScanner
        initialStream={barcodeStream}
        initialError={barcodeCameraError}
        onDetected={handleBarcodeDetected}
        onClose={closeBarcodeScanner}
      />
    </Suspense>}
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
      const LibraryIcon = selectedLibrary.icon;
      return <div className={`app-library-backdrop ${isLibraryClosing ? 'app-library-closing' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) closeLibrary(); }}>
        <section className={`app-library-modal library-${selectedLibrary.tone}`} role="dialog" aria-modal="true" aria-labelledby="app-library-title">
          <header className="app-library-modal-header">
            <div className="app-library-modal-identity">
              <span className="app-library-icon"><LibraryIcon size={22} /></span>
              <div><span className="library-eyebrow">RETAILOS · THƯ VIỆN NGHIỆP VỤ</span><h2 id="app-library-title">{selectedLibrary.title}</h2><p>{filteredModules.filter((module) => selectedLibrary.moduleIds.includes(module.id)).length} chức năng</p></div>
            </div>
            <button ref={libraryCloseButtonRef} type="button" className="icon-button" aria-label="Đóng thư viện" onClick={closeLibrary}><X size={18} /></button>
          </header>
          <div className="app-library-modules">
            {filteredModules.filter((module) => selectedLibrary.moduleIds.includes(module.id)).map((module, index) => {
              const Icon = module.icon;
              return <button key={module.id} type="button" className={`app-library-module module-${module.tone}`} style={{ '--library-index': index } as React.CSSProperties} onClick={() => announce(`${module.title} · Demo`)}>
                <span className="module-icon"><Icon size={20} /></span><span className="app-library-module-copy"><strong>{module.title}</strong><small>{module.description}</small></span><ArrowUpRight size={16} className="app-library-module-arrow" />
              </button>;
            })}
          </div>
          <p className="app-library-note"><ShieldCheck size={14} /> Thư viện nghiệp vụ · Dữ liệu tải theo quyền được cấp</p>
        </section>
      </div>;
    })()}
    {selectedNotice && (() => {
      const NoticeIcon = selectedNotice.icon;
      return <div className={`notice-detail-backdrop ${isNoticeClosing ? 'notice-detail-closing' : ''}`} onClick={(event) => { if (event.target === event.currentTarget) closeNotice(); }}>
        <section className="notice-detail-modal" role="dialog" aria-modal="true" aria-labelledby="notice-detail-title">
          <header className="notice-detail-header">
            <span className={`notice-detail-icon ${selectedNotice.tone}`}><NoticeIcon size={21} /></span>
            <div><span className="notice-detail-kicker">{selectedNotice.category} · SNAPSHOT {new Date(selectedNotice.snapshotDate).toLocaleDateString('vi-VN')}</span><h2 id="notice-detail-title">{selectedNotice.title}</h2></div>
            <button ref={noticeCloseButtonRef} type="button" className="icon-button" aria-label="Đóng bản tin" onClick={closeNotice}><X size={18} /></button>
          </header>
          <div className="notice-detail-content">
            <div className="notice-detail-author"><span className="notice-detail-brand"><Command size={15} /></span><span><strong>RetailOS</strong><small>Bản tin ưu tiên</small></span></div>
            <p>{selectedNotice.summary}</p>
            <div className="notice-detail-message">{selectedNotice.details}</div>
          </div>
          <footer className="notice-detail-footer"><ShieldCheck size={15} /><span>Cảnh báo được tính trên snapshot đã lưu trong thiết bị.</span></footer>
        </section>
      </div>;
    })()}
    {toast && <div className="toast-message" role="status"><span className="toast-check"><Check size={16} /></span><span>{toast}</span><button onClick={() => setToast('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}
  </>;
}
