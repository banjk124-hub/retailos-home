import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

declare const __RETAILOS_BUILD_ID__: string;
import LoginExperience from './features/auth/screens/LoginExperience';
import './styles/auth-journey.css';
import { clearLastLoginName, saveLastLoginName } from './features/auth/services/lastLoginStore';
import { clearSession, readSession, saveSession } from './features/auth/services/sessionStore';
import { clearCachedModuleData } from './features/data/moduleDataService';
import type { EmployeeSession } from './shared/domain/employee';
import { getDepartment, type DepartmentConfig } from './shared/config/departments';
import { ExperienceBackground } from './shared/components/ExperienceBackground';
import AuthenticatedAppShell from './platform/shell/AuthenticatedAppShell';
import { useAdaptiveAppearance } from './shared/hooks/useAdaptiveAppearance';

import { MOTION_CONFIG, useMotionState } from './shared/motion';
import type { MotionOrigin } from './shared/motion';
import { releaseCameraStream } from './shared/services/cameraSession';
import { notifyPwaUpdateSafetyChanged, registerPwaUpdateBlocker } from './shared/pwa/updateSafety';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type AuthJourney = 'login' | 'identity' | 'home';

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
  const transitionStateRef = useRef({ isEnteringHome, isLeavingHome });
  transitionStateRef.current = { isEnteringHome, isLeavingHome };

  const reportBootHealthy = useCallback(() => {
    document.documentElement.dataset.retailosBootHealthy = 'true';
    navigator.serviceWorker?.controller?.postMessage({
      type: 'APP_BOOT_OK',
      buildId: __RETAILOS_BUILD_ID__,
    });
    window.dispatchEvent(new Event('retailos:boot-healthy'));
  }, []);

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
    return <AuthenticatedAppShell
    employee={employee}
    department={department}
    journey={authJourney}
    identityOrigin={identityOrigin}
    isEnteringHome={isEnteringHome}
    isLeavingHome={isLeavingHome}
    isOffline={isOffline}
    canInstall={canInstall}
    onInstall={handleInstall}
    onLogout={handleLogout}
    onBootReady={reportBootHealthy}
  />;
}
