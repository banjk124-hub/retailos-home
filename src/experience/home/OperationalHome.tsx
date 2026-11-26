import { CalendarDays, ChevronRight, CircleAlert, Clock3, Database, ShieldCheck } from 'lucide-react';
import type { EmployeeSession } from '../../features/auth/types';
import type { DepartmentConfig } from '../../shared/config/departments';
import type { SnapshotNotice } from '../../features/home/snapshotNoticeRules';
import { MODULE_REGISTRY, type RetailModule } from '../../features/home/moduleRegistry';
import { getDepartmentIcon, getModuleIcon, MotionIcon } from '../../shared/icons';

type Props = {
  employee: EmployeeSession;
  department: DepartmentConfig;
  notices: SnapshotNotice[];
  noticeStatusMessage: string;
  noticeStatus: 'loading' | 'ready' | 'empty' | 'unavailable';
  onOpenModule: (module: RetailModule) => void;
  onOpenNotice: (notice: SnapshotNotice, trigger: HTMLButtonElement) => void;
  onOpenCalendar: () => void;
};

export function OperationalHome({ employee, department, notices, noticeStatusMessage, noticeStatus, onOpenModule, onOpenNotice, onOpenCalendar }: Props) {
  const DepartmentIcon = getDepartmentIcon(department.id);
  return (
    <div className="retailos-home" id="home" aria-label="Tổng quan vận hành">
      <section className="retailos-home__welcome">
        <div className="retailos-home__welcome-copy">
          <span className="retailos-home__eyebrow">RETAIL OPERATIONS · WORKSPACE</span>
          <h1>Xin chào, <span>{employee.name}</span></h1>
          <p><DepartmentIcon size={15} aria-hidden="true" /> {department.label} <i aria-hidden="true">·</i> Không gian làm việc của bạn</p>
        </div>
        <button className="retailos-home__calendar" type="button" onClick={onOpenCalendar}>
          <span className="retailos-home__calendar-icon"><CalendarDays size={19} /></span>
          <span><small>LỊCH HÔM NAY</small><strong>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</strong></span>
          <ChevronRight size={17} />
        </button>
      </section>
      <section className="retailos-home__section" aria-labelledby="retailos-home-modules-title">
        <div className="retailos-home__section-heading">
          <div><span className="retailos-home__eyebrow">WORKSPACE</span><h2 id="retailos-home-modules-title">Truy cập nghiệp vụ</h2><p>Chọn chức năng để bắt đầu công việc</p></div>
          <span className="retailos-home__count">{MODULE_REGISTRY.length} chức năng</span>
        </div>
        <div className="retailos-home__module-grid">
          {MODULE_REGISTRY.map((module) => {
            const ModuleIcon = getModuleIcon(module.id);
            const ready = module.availability === 'ready';
            return <button key={module.id} type="button" className={`retailos-home__module ${ready ? 'is-ready' : 'is-integrating'}`} onClick={() => onOpenModule(module)}>
              <span className={`retailos-home__module-icon tone-${module.tone}`}><MotionIcon icon={ModuleIcon} variant="module" size={21} /></span>
              <span className="retailos-home__module-copy"><strong>{module.title}</strong><small>{module.description}</small></span>
              <span className={`retailos-home__module-state ${ready ? 'is-ready' : ''}`}>{ready ? 'Sẵn sàng' : 'Đang tích hợp'}</span>
              <ChevronRight className="retailos-home__module-arrow" size={16} />
            </button>;
          })}
        </div>
      </section>
      <section className="retailos-home__section retailos-home__signals" aria-labelledby="retailos-home-signals-title">
        <div className="retailos-home__section-heading">
          <div><span className="retailos-home__eyebrow">DATA SIGNALS</span><h2 id="retailos-home-signals-title">Cảnh báo vận hành</h2><p>Phân tích từ snapshot đã lưu trên thiết bị</p></div>
          <span className={`retailos-home__signal-count ${notices.length ? 'has-alerts' : ''}`}><CircleAlert size={14} /> {notices.length} cảnh báo</span>
        </div>
        {notices.length > 0 ? <div className="retailos-home__notice-list">
          {notices.slice(0, 3).map((notice) => {
            const NoticeIcon = getModuleIcon(notice.moduleId);
            return <button key={notice.id} type="button" className="retailos-home__notice" onClick={(event) => onOpenNotice(notice, event.currentTarget)}>
              <span className={`retailos-home__notice-icon tone-${notice.tone}`}><MotionIcon icon={NoticeIcon} variant="module" size={18} /></span>
              <span className="retailos-home__notice-copy"><strong>{notice.title}</strong><small>{notice.summary}</small><span>{notice.category}</span></span>
              <ChevronRight size={17} />
            </button>;
          })}
        </div> : <div className={`retailos-home__signal-empty status-${noticeStatus}`} role="status">
          {noticeStatus === 'loading' ? <Clock3 size={18} /> : noticeStatus === 'unavailable' ? <CircleAlert size={18} /> : <ShieldCheck size={18} />}
          <span>{noticeStatusMessage}</span>
        </div>}
        <p className="retailos-home__signal-footnote"><Database size={13} /> Snapshot là dữ liệu lưu cục bộ, không đại diện cho trạng thái realtime.</p>
      </section>
    </div>
  );
}
