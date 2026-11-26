import type { Ref } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Database, ShieldCheck, Sparkles } from 'lucide-react';
import { type ModuleLibraryDefinition, type RetailModule } from '../../features/home/moduleRegistry';
import { getLibraryIcon, getModuleIcon, MotionIcon } from '../../shared/icons';

type Props = {
  library: ModuleLibraryDefinition;
  modules: RetailModule[];
  closeButtonRef: Ref<HTMLButtonElement>;
  onClose: () => void;
  onLaunch: (module: RetailModule) => void;
};

export function LibraryDetail({ library, modules, closeButtonRef, onClose, onLaunch }: Props) {
  const LibraryIcon = getLibraryIcon(library.id);
  const readyCount = modules.filter((module) => module.availability === 'ready').length;

  return (
    <div className="retailos-library-detail">
      <header className="retailos-library-detail__header">
        <div className="retailos-library-detail__identity">
          <span className={`retailos-library-detail__icon tone-${library.tone}`}>
            <MotionIcon icon={LibraryIcon} variant="module" size={23} />
          </span>
          <div className="retailos-library-detail__heading">
            <span className="retailos-library-detail__eyebrow">RETAILOS / THƯ VIỆN NGHIỆP VỤ</span>
            <h2 id="app-library-title">{library.title}</h2>
            <p>{library.description}</p>
          </div>
        </div>
        <button ref={closeButtonRef} type="button" className="retailos-library-detail__close" aria-label="Đóng thư viện" onClick={onClose}>
          <ArrowLeft size={18} /><span>Đóng</span>
        </button>
      </header>

      <div className="retailos-library-detail__overview" aria-label="Tổng quan nhóm chức năng">
        <div><strong>{modules.length}</strong><span>Chức năng</span></div>
        <i />
        <div><strong>{readyCount}</strong><span>Sẵn sàng</span></div>
        <i />
        <div><strong>{modules.length - readyCount}</strong><span>Đang tích hợp</span></div>
      </div>

      <div className="retailos-library-detail__section-heading">
        <div><span>WORKSPACE</span><h3>Chức năng trong nhóm</h3></div>
        <span className="retailos-library-detail__section-count">{modules.length.toString().padStart(2, '0')} ITEMS</span>
      </div>

      <div className="retailos-library-detail__modules">
        {modules.map((module) => {
          const ModuleIcon = getModuleIcon(module.id);
          const ready = module.availability === 'ready';
          return (
            <button
              key={module.id}
              type="button"
              className={`retailos-library-detail__module tone-${module.tone} ${ready ? 'is-ready' : 'is-integrating'}`}
              aria-label={`${module.title}. ${ready ? 'Đã triển khai' : 'Đang tích hợp'}`}
              onClick={() => onLaunch(module)}
            >
              <span className="retailos-library-detail__module-icon"><MotionIcon icon={ModuleIcon} variant="module" size={21} /></span>
              <span className="retailos-library-detail__module-copy">
                <strong>{module.title}</strong>
                <small>{module.description}</small>
                <span className={`retailos-library-detail__status ${ready ? 'is-ready' : 'is-integrating'}`}>
                  {ready ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                  {ready ? 'Đã triển khai' : 'Đang tích hợp'}
                </span>
              </span>
              <span className="retailos-library-detail__module-action">{ready ? 'Mở chức năng' : 'Xem trạng thái'}<ArrowUpRight size={16} /></span>
            </button>
          );
        })}
      </div>

      <footer className="retailos-library-detail__footer">
        <ShieldCheck size={15} />
        <span>Trạng thái chức năng và dữ liệu snapshot được quản lý độc lập.</span>
        <span className="retailos-library-detail__data-note"><Database size={13} /> Nguồn dữ liệu theo từng chức năng</span>
      </footer>
    </div>
  );
}
