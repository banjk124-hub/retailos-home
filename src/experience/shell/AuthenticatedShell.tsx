import { useEffect, useState } from 'react';
import { Activity, Bell, Boxes, ChevronRight, CircleHelp, Home, LogOut, Settings, Wifi, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EmployeeSession } from '../../features/auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import { Brand } from '../../shared/brand';

type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  isOffline: boolean;
  canInstall: boolean;
  onInstall: () => Promise<void> | void;
  onLogout: () => void;
  children: ReactNode;
};

const navigation = [
  { id: 'home', label: 'Tổng quan', icon: Home, target: 'home' },
  { id: 'modules', label: 'Thư viện nghiệp vụ', icon: Boxes, target: 'modules' },
  { id: 'activity', label: 'Hoạt động', icon: Activity, target: 'activity' },
] as const;

export function AuthenticatedShell({
  employee,
  department,
  isOffline,
  canInstall,
  onInstall,
  onLogout,
  children,
}: Props) {
  const [activeSection, setActiveSection] = useState('home');
  const initials = employee.name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();

  useEffect(() => {
    const sections = navigation
      .map((item) => document.getElementById(item.target))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.15, 0.4, 0.7] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const navigate = (target: string) => {
    setActiveSection(target);
    if (target === 'home') {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    document.getElementById(target)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const openSettings = () => window.dispatchEvent(new Event('retailos:open-settings'));
  const openNotifications = () => window.dispatchEvent(new Event('retailos:open-notifications'));

  return (
    <div className="retailos-experience">
      <aside className="retailos-experience__rail" aria-label="Điều hướng RetailOS">
        <div className="retailos-experience__brand"><Brand variant="full" surface="light" /></div>
        <div className="retailos-experience__workspace">
          <span className="retailos-experience__workspace-mark">R</span>
          <span><strong>Retail Operations</strong><small>{department.label}</small></span>
          <ChevronRight size={15} aria-hidden="true" />
        </div>
        <span className="retailos-experience__section-label">KHÔNG GIAN LÀM VIỆC</span>
        <nav className="retailos-experience__navigation" aria-label="Khu vực chính">
          {navigation.map(({ id, label, icon: Icon, target }) => (
            <button
              key={id}
              type="button"
              className={`retailos-experience__nav-item ${activeSection === target ? 'is-active' : ''}`}
              aria-current={activeSection === target ? 'page' : undefined}
              onClick={() => navigate(target)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
          <button type="button" className="retailos-experience__nav-item" onClick={openSettings}>
            <Settings size={18} strokeWidth={1.8} /><span>Cài đặt hệ thống</span>
          </button>
        </nav>
        <div className="retailos-experience__rail-spacer" />
        <div className="retailos-experience__rail-status">
          <span className={`retailos-experience__status-dot ${isOffline ? 'is-offline' : ''}`} />
          <span>{isOffline ? 'Đang ngoại tuyến' : 'Hệ thống sẵn sàng'}</span>
        </div>
        <div className="retailos-experience__profile">
          <span className="retailos-experience__avatar">{initials || 'NV'}</span>
          <span className="retailos-experience__profile-copy"><strong>{employee.name}</strong><small>{department.label}</small></span>
          <button type="button" aria-label="Đăng xuất" title="Đăng xuất" onClick={onLogout}><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="retailos-experience__main">
        <header className="retailos-experience__topbar">
          <div className="retailos-experience__mobile-brand"><Brand variant="compact" surface="light" /></div>
          <div className="retailos-experience__breadcrumb">
            <span>RetailOS</span><ChevronRight size={14} /><strong>Không gian làm việc</strong>
          </div>
          <div className="retailos-experience__topbar-actions">
            <span className={`retailos-experience__connection ${isOffline ? 'is-offline' : ''}`}>
              {isOffline ? <WifiOff size={15} /> : <Wifi size={15} />}
              <span>{isOffline ? 'Ngoại tuyến' : 'Đang kết nối'}</span>
            </span>
            {canInstall && <button type="button" className="retailos-experience__icon-button install" aria-label="Cài đặt RetailOS" title="Cài đặt RetailOS" onClick={onInstall}><Home size={17} /></button>}
            <button type="button" className="retailos-experience__icon-button" aria-label="Thông báo" title="Thông báo" onClick={openNotifications}><Bell size={18} /></button>
            <button type="button" className="retailos-experience__icon-button mobile-logout" aria-label="Đăng xuất" title="Đăng xuất" onClick={onLogout}><LogOut size={17} /></button>
          </div>
        </header>
        {isOffline && <div className="retailos-experience__offline-banner"><WifiOff size={15} /> Đang ngoại tuyến. Các chức năng hỗ trợ offline vẫn có thể tiếp tục sử dụng.</div>}
        <main className="retailos-experience__workspace-content">{children}</main>
        <footer className="retailos-experience__mobile-footer">
          <button type="button" className={activeSection === 'home' ? 'is-active' : ''} onClick={() => navigate('home')}><Home size={18} /><span>Tổng quan</span></button>
          <button type="button" className={activeSection === 'modules' ? 'is-active' : ''} onClick={() => navigate('modules')}><Boxes size={18} /><span>Chức năng</span></button>
          <button type="button" onClick={openSettings}><Settings size={18} /><span>Cài đặt</span></button>
        </footer>
      </div>
    </div>
  );
}
