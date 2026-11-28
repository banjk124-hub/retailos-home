import type { CSSProperties } from 'react';
import type { EmployeeSession } from '../../shared/domain/employee';
import type { DepartmentConfig } from '../../shared/config/departments';
import type { MotionOrigin } from '../../shared/motion';
import { ExperienceBackground } from '../../shared/components/ExperienceBackground';
import { Brand, BrandMotion } from '../../shared/brand';
import { getDepartmentIcon, MotionIcon } from '../../shared/icons';
import { useRetailPlatform } from '../../shared/platform/platformContext';
import { HomePresentationRoot } from '../home/HomePresentationRoot';
import { PersistentShellNavigation, ShellNavigationProvider } from './shellNavigationContext';
import { JourneyControllerProvider } from '../journey/JourneyControllerProvider';
import { ActivePageHost } from '../journey/ActivePageHost';

type IdentityMotionStyle = CSSProperties & {
  '--identity-origin-x': string;
  '--identity-origin-y': string;
  '--identity-reveal-radius': string;
};

type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  journey: 'identity' | 'home';
  identityOrigin: MotionOrigin | null;
  isEnteringHome: boolean;
  isLeavingHome: boolean;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
  onLogout: () => void;
  onBootReady: () => void;
};

function AmbientBackground() {
  return <div className="ambient-background" aria-hidden="true">
    <span className="ambient-orb ambient-orb-one" />
    <span className="ambient-orb ambient-orb-two" />
    <span className="ambient-orb ambient-orb-three" />
  </div>;
}

function PageGlassDock() {
  return <div className="page-floating-dock" aria-hidden="true">
    <span className="page-floating-highlight page-floating-highlight-one" />
    <span className="page-floating-highlight page-floating-highlight-two" />
  </div>;
}

function IdentityJourneyView({
  employee,
  department,
  identityOrigin,
}: Pick<Props, 'employee' | 'department' | 'identityOrigin'>) {
  const DepartmentIcon = getDepartmentIcon(department.id);
  const initials = employee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'RT';
  const originX = identityOrigin?.x ?? window.innerWidth / 2;
  const originY = identityOrigin?.y ?? window.innerHeight / 2;
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

function HomeLoadingSurface() {
  return (
    <div className="home-loading-surface" role="status" aria-live="polite" aria-busy="true">
      <div className="home-loading-surface__panel">
        <span className="home-loading-surface__indicator" aria-hidden="true" />
        <strong>Đang mở RetailOS</strong>
        <span>Đang chuẩn bị không gian làm việc…</span>
      </div>
    </div>
  );
}

/**
 * Authenticated shell composition only.
 * App remains the sole owner of session/auth state, transition policy and PWA lifecycle.
 */
export default function AuthenticatedAppShell({
  employee,
  department,
  journey,
  identityOrigin,
  isEnteringHome,
  isLeavingHome,
  isOffline,
  canInstall,
  onInstall,
  onLogout,
  onBootReady,
}: Props) {
  const platform = useRetailPlatform();

  return (
    <div className="retailos-scene">
      <ExperienceBackground experience="home" />
      <AmbientBackground />
      <PageGlassDock />
      <div className="retailos-interface">
        {journey === 'identity' ? (
          <IdentityJourneyView employee={employee} department={department} identityOrigin={identityOrigin} />
        ) : (
          <ShellNavigationProvider>
            <JourneyControllerProvider>
              <HomePresentationRoot platform={platform}>
                <div className={isLeavingHome ? 'app-transition-leave' : ''}>
                  <ActivePageHost
                    employee={employee}
                    department={department}
                    onLogout={onLogout}
                    isEnteringHome={isEnteringHome}
                    isOffline={isOffline}
                    canInstall={canInstall}
                    onInstall={onInstall}
                    onBootReady={onBootReady}
                    platform={platform}
                  />
                </div>
                <PersistentShellNavigation platform={platform} />
              </HomePresentationRoot>
            </JourneyControllerProvider>
          </ShellNavigationProvider>
        )}
      </div>
    </div>
  );
}
