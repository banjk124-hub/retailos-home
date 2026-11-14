import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import LoginExperience from './features/auth/screens/LoginExperience';
import { clearLastLoginName, saveLastLoginName } from './features/auth/services/lastLoginStore';
import { clearSession, readSession, saveSession } from './features/auth/services/sessionStore';
import { clearCachedModuleData } from './features/data/moduleDataService';
import type { EmployeeSession } from './features/auth/types';
import { getDepartment, type DepartmentConfig } from './shared/config/departments';
import { ExperienceBackground } from './shared/components/ExperienceBackground';
import { Brand, BrandMotion } from './shared/brand';
import { useAdaptiveAppearance } from './shared/hooks/useAdaptiveAppearance';
import { getDepartmentIcon, MotionIcon } from './shared/icons';
import { MOTION_CONFIG, useMotionState } from './shared/motion';
import type { MotionOrigin } from './shared/motion';
import type { CSSProperties } from 'react';
import { releaseCameraStream } from './shared/services/cameraSession';

const HomeScreen = lazy(() => import('./features/home/HomeScreen'));

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type AuthJourney = 'login' | 'identity' | 'home';

function AmbientBackground() {
  return <div className="ambient-background" aria-hidden="true">
    <span className="ambient-orb ambient-orb-one" />
    <span className="ambient-orb ambient-orb-two" />
    <span className="ambient-orb ambient-orb-three" />
  </div>;
}

function PageGlassDock() {
  return <div className="page-glass-dock" aria-hidden="true">
    <span className="page-glass-highlight page-glass-highlight-one" />
    <span className="page-glass-highlight page-glass-highlight-two" />
  </div>;
}

type IdentityMotionStyle = CSSProperties & {
  '--identity-origin-x': string;
  '--identity-origin-y': string;
  '--identity-reveal-radius': string;
};

function UnifiedIdentityView({
  employee,
  department,
  origin,
}: {
  employee: EmployeeSession;
  department: DepartmentConfig;
  origin: MotionOrigin | null;
}) {
  const DepartmentIcon = getDepartmentIcon(department.id);
  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'RT';
  const originX = origin?.x ?? window.innerWidth / 2;
  const originY = origin?.y ?? window.innerHeight / 2;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const revealRadius = Math.ceil(Math.max(
    Math.hypot(originX, originY),
    Math.hypot(viewportWidth - originX, originY),
    Math.hypot(originX, viewportHeight - originY),
    Math.hypot(viewportWidth - originX, viewportHeight - originY),
  ) + 2);
  const motionStyle: IdentityMotionStyle = {
    '--identity-origin-x': `${originX}px`,
    '--identity-origin-y': `${originY}px`,
    '--identity-reveal-radius': `${revealRadius}px`,
  };

  return (
    <div className="auth-journey-recognition" style={motionStyle} role="status" aria-live="polite" aria-label={`Đang nhận diện ${employee.name}`}>
      <div className="auth-journey-recognition__backdrop" aria-hidden="true" />
      <div className="auth-journey-recognition__panel">
        <BrandMotion className="auth-journey-recognition__brand" phase="reveal">
          <Brand variant="full" surface="dark" />
        </BrandMotion>
        <div className="auth-journey-recognition__identity">
          <div className="auth-journey-recognition__avatar" aria-hidden="true">{initials}</div>
          <div className="auth-journey-recognition__meta">
            <span>NHÂN VIÊN ĐƯỢC NHẬN DIỆN</span>
            <strong>{employee.name}</strong>
            <small>
              {DepartmentIcon ? (
                <><MotionIcon icon={DepartmentIcon} variant="department" state="active" size={14} /> {department.label} · {department.tagline}</>
              ) : (
                `${department.label} · ${department.tagline}`
              )}
            </small>
          </div>
        </div>
        <div className="auth-journey-recognition__status">Đang mở không gian làm việc</div>
      </div>
    </div>
  );
}

export default function App() {
  useAdaptiveAppearance();
  const { prefersReducedMotion } = useMotionState();
  const [employee, setEmployee] = useState<EmployeeSession | null>(() => readSession());
  const [authJourney, setAuthJourney] = useState<AuthJourney>(() => (readSession() ? 'home' : 'login'));
  const [identityOrigin, setIdentityOrigin] = useState<MotionOrigin | null>(null);
  const [isEnteringHome, setIsEnteringHome] = useState(false);
  const [isLeavingHome, setIsLeavingHome] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const handleAuthenticated = useCallback((session: EmployeeSession, origin?: MotionOrigin) => {
    saveSession(session);
    saveLastLoginName(session.name);
    setEmployee(session);
    setIdentityOrigin(origin ?? null);
    setAuthJourney('identity');
    setIsEnteringHome(false);
    setIsLeavingHome(false);
  }, []);

  const handleLogout = useCallback(() => {
    releaseCameraStream();
    setIsLeavingHome(true);
    window.setTimeout(() => {
      clearSession();
      clearLastLoginName();
      const finishLogout = () => {
        setEmployee(null);
        setIdentityOrigin(null);
        setAuthJourney('login');
        setIsLeavingHome(false);
        setIsEnteringHome(false);
      };
      void clearCachedModuleData().then(finishLogout).catch((error: unknown) => {
        console.error('Không thể xóa cache dữ liệu module khi đăng xuất:', error);
        finishLogout();
      });
    }, 420);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    await deferredPromptRef.current.userChoice;
    deferredPromptRef.current = null;
    setCanInstall(false);
  }, []);

  useEffect(() => {
    if (!employee) return;
    const department = getDepartment(employee.departmentId);
    if (!department) {
      clearSession();
      clearLastLoginName();
      setEmployee(null);
      setIdentityOrigin(null);
      setAuthJourney('login');
    }
  }, [employee]);

  useEffect(() => {
    if (authJourney === 'identity') {
      const timer = window.setTimeout(() => {
        setAuthJourney('home');
        setIsEnteringHome(true);
      }, prefersReducedMotion ? 0 : MOTION_CONFIG.journey.identityHoldMs);
      return () => window.clearTimeout(timer);
    }

    if (authJourney === 'home') {
      const timer = window.setTimeout(() => setIsEnteringHome(false), prefersReducedMotion ? 0 : MOTION_CONFIG.journey.homeArrivalMs);
      return () => window.clearTimeout(timer);
    }
  }, [authJourney, prefersReducedMotion]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setCanInstall(false);
        return;
      }
      setCanInstall(true);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!employee) return <div className="retailos-scene">
    <ExperienceBackground experience="login" />
    <div className="retailos-interface">
      <LoginExperience onAuthenticated={handleAuthenticated} />
    </div>
  </div>;

  const department = getDepartment(employee.departmentId);
  if (!department) return <div className="retailos-scene">
    <ExperienceBackground experience="login" />
    <div className="retailos-interface">
      <LoginExperience onAuthenticated={handleAuthenticated} />
    </div>
  </div>;

  if (authJourney === 'login') {
    return <div className="retailos-scene">
      <ExperienceBackground experience="login" />
      <div className="retailos-interface">
        <LoginExperience onAuthenticated={handleAuthenticated} />
      </div>
    </div>;
  }

  if (authJourney === 'identity') {
    return <div className="retailos-scene">
      <ExperienceBackground experience="home" />
      <AmbientBackground />
      <PageGlassDock />
      <div className="retailos-interface">
        <UnifiedIdentityView employee={employee} department={department} origin={identityOrigin} />
      </div>
    </div>;
  }

  return <div className="retailos-scene">
    <ExperienceBackground experience="home" />
    <AmbientBackground />
    <PageGlassDock />
    <div className="retailos-interface">
      <Suspense fallback={<div className="retailos-interface" aria-busy="true" />}>
        <div className={isLeavingHome ? 'app-transition-leave' : ''}>
          <HomeScreen
          employee={employee}
          department={department}
          onLogout={handleLogout}
          isEnteringHome={isEnteringHome}
          isOffline={isOffline}
          canInstall={canInstall}
            onInstall={handleInstall}
          />
        </div>
      </Suspense>
    </div>
  </div>;
}
