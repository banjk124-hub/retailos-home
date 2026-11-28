import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, Search, X } from 'lucide-react';
import { MODULE_LIBRARIES, MODULE_REGISTRY, type ModuleLibraryDefinition, type RetailModule } from '../../features/home/moduleRegistry';
import { getLibraryIcon, getModuleIcon } from '../../features/home/homeIconRegistry';
import { Surface } from '../../shared/components/surface/Surface';
import { MotionCard } from '../../shared/motion';
import { MotionIcon } from '../../shared/icons';
import { useJourneyController, useJourneySnapshot } from '../journey/JourneyControllerProvider';
import { getActiveJourneyDestination } from '../journey/journeyController';
import { isJourneyDestinationResolvable } from '../journey/journeyPageRegistry';
import './ShellModuleLibrary.css';

type Props = { onClose: () => void };

export function ShellModuleLibrary({ onClose }: Props) {
  const controller = useJourneyController();
  const snapshot = useJourneySnapshot();
  const destination = getActiveJourneyDestination(snapshot);
  const activeModuleId = destination.kind === 'feature' ? destination.moduleId : null;
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibraryDefinition>(() => MODULE_LIBRARIES.find((library) => activeModuleId && library.moduleIds.includes(activeModuleId)) ?? MODULE_LIBRARIES[0]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const selectedModules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return selectedLibrary.moduleIds
      .map((id) => MODULE_REGISTRY.find((module) => module.id === id))
      .filter((module): module is RetailModule => Boolean(module))
      .filter((module) => !query || `${module.title} ${module.description}`.toLocaleLowerCase('vi').includes(query));
  }, [selectedLibrary, search]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const openModule = async (module: RetailModule) => {
    if (!isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id }) || module.id === activeModuleId) return;
    setMessage('');
    const moved = await controller.dispatch({ kind: 'push', destination: { kind: 'feature', moduleId: module.id } });
    if (moved) onClose();
    else setMessage('Chưa thể chuyển chức năng. Hãy xử lý thao tác đang chạy trước.');
  };

  return (
    <div className="shell-module-library-backdrop" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="shell-module-library" role="dialog" aria-modal="true" aria-labelledby="shell-module-library-title">
        <header className="shell-module-library__header">
          <div className="shell-module-library__brand">
            <span className="shell-module-library__brand-mark"><MotionIcon icon={getLibraryIcon('stocktake')} variant="module" size={23} /></span>
            <div>
              <span className="shell-module-library__eyebrow">RETAILOS / WORKSPACE</span>
              <h2 id="shell-module-library-title">Thư viện nghiệp vụ</h2>
              <p>Truy cập nhanh các công cụ vận hành</p>
            </div>
          </div>
          <button ref={closeRef} className="shell-module-library__close" type="button" aria-label="Đóng thư viện" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div className="shell-module-library__body">
          <div className="shell-module-library__group-list" aria-label="Nhóm chức năng">
            <div className="shell-module-library__section-heading"><span>KHÔNG GIAN</span><small>{MODULE_LIBRARIES.length} nhóm</small></div>
            {MODULE_LIBRARIES.map((library, index) => {
              const Icon = getLibraryIcon(library.id);
              const active = selectedLibrary.id === library.id;
              return (
                <MotionCard key={library.id}>
                  <Surface as="button" variant="panel" interactive type="button"
                    className={`shell-module-library__group tone-${library.tone}${active ? ' is-selected' : ''}`}
                    aria-pressed={active}
                    onClick={() => { setSelectedLibrary(library); setSearch(''); setMessage(''); }}>
                    <span className="shell-module-library__group-icon"><MotionIcon icon={Icon} variant="module" size={20} active={active} /></span>
                    <span className="shell-module-library__group-copy"><small>NHÓM {String(moduleIndex + 1).padStart(2, '0')}</small><strong>{library.title}</strong><em>{library.description}</em></span>
                    <ChevronRight size={16} />
                  </Surface>
                </MotionCard>
              );
            })}
          </div>

          <div className="shell-module-library__module-panel">
            <div className="shell-module-library__module-heading">
              <div><span>ĐANG XEM</span><h3>{selectedLibrary.title}</h3><p>{selectedLibrary.description}</p></div>
              <label className="shell-module-library__search">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong nhóm" aria-label="Tìm chức năng trong nhóm" />
                {search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setSearch('')}><X size={14} /></button>}
              </label>
            </div>
            <div className="shell-module-library__module-list">
              {selectedModules.map((module) => {
                const moduleIndex = selectedLibrary.moduleIds.indexOf(module.id);
                const Icon = getModuleIcon(module.id);
                const available = isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id });
                const active = module.id === activeModuleId;
                return (
                  <MotionCard key={module.id}>
                    <Surface as="button" variant="panel" interactive type="button"
                      className={`shell-module-library__module tone-${module.tone}`}
                      disabled={!available || active}
                      onClick={() => { void openModule(module); }}>
                      <span className="shell-module-library__module-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="shell-module-library__module-icon"><MotionIcon icon={Icon} variant="module" size={21} /></span>
                      <span className="shell-module-library__module-copy"><strong>{module.title}</strong><small>{module.description}</small><em className={available ? 'is-ready' : 'is-pending'}>{active ? 'Đang mở' : available ? 'Sẵn sàng' : 'Đang tích hợp'}</em></span>
                      <ArrowUpRight size={17} />
                    </Surface>
                  </MotionCard>
                );
              })}
              {selectedModules.length === 0 && <div className="shell-module-library__empty"><Search size={20} /><strong>Không tìm thấy chức năng</strong><span>Thử từ khóa ngắn hoặc chọn nhóm khác.</span></div>}
            </div>
          </div>
        </div>
        {message && <p className="shell-module-library__message" role="status">{message}</p>}
        <footer className="shell-module-library__footer"><span>RETAILOS</span><span>Trạng thái công việc được bảo toàn khi chuyển trang</span></footer>
      </section>
    </div>
  );
}
