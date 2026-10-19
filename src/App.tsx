import { useCallback, useEffect, useRef, useState } from 'react';
import LoginScreen from './features/auth/components/LoginScreen';
import { clearSession, readSession, saveSession } from './features/auth/services/sessionStore';
import { clearCachedModuleData } from './features/data/moduleDataService';
import type { EmployeeSession } from './features/auth/types';
import HomeScreen from './features/home/HomeScreen';
import { getDepartment } from './shared/config/departments';
import { useAdaptiveAppearance } from './shared/hooks/useAdaptiveAppearance';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

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

export default function App() {
  const appearance = useAdaptiveAppearance();
  const [employee, setEmployee] = useState<EmployeeSession | null>(() => readSession());
  const [isEnteringHome, setIsEnteringHome] = useState(false);
  const [isLeavingHome, setIsLeavingHome] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const handleAuthenticated = useCallback((session: EmployeeSession) => {
    saveSession(session);
    setEmployee(session);
    setIsEnteringHome(true);
    setIsLeavingHome(false);
  }, []);

  const handleLogout = useCallback(() => {
    setIsLeavingHome(true);
    window.setTimeout(() => {
      clearSession();
      const finishLogout = () => {
        setEmployee(null);
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
      setEmployee(null);
    }
  }, [employee]);

  useEffect(() => {
    if (!isEnteringHome) return;
    const timer = window.setTimeout(() => setIsEnteringHome(false), 1200);
    return () => window.clearTimeout(timer);
  }, [isEnteringHome]);

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
    <AmbientBackground />
    <PageGlassDock />
    <div className="retailos-interface">
      <LoginScreen onAuthenticated={handleAuthenticated} />
    </div>
  </div>;
  const department = getDepartment(employee.departmentId);
  if (!department) return <div className="retailos-scene">
    <AmbientBackground />
    <PageGlassDock />
    <div className="retailos-interface">
      <LoginScreen onAuthenticated={handleAuthenticated} />
    </div>
  </div>;

  return <div className="retailos-scene">
    <AmbientBackground />
    <PageGlassDock />
    <div className="retailos-interface">
      <div className={isLeavingHome ? 'app-transition-leave' : ''}>
        <HomeScreen
          employee={employee}
          department={department}
          onLogout={handleLogout}
          isEnteringHome={isEnteringHome}
          isOffline={isOffline}
          canInstall={canInstall}
          onInstall={handleInstall}
          appearancePreference={appearance.preference}
          isLowPowerMode={appearance.isLowPower}
          onCycleAppearance={appearance.cyclePreference}
        />
      </div>
    </div>
  </div>;
}
