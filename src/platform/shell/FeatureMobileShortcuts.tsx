import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Home, LibraryBig, X } from 'lucide-react';
import { MODULE_LIBRARIES, MODULE_REGISTRY, type ModuleLibraryDefinition, type RetailModule } from '../../features/home/moduleRegistry';
import { getLibraryIcon, getModuleIcon } from '../../features/home/homeIconRegistry';
import { useJourneyController, useJourneySnapshot } from '../journey/JourneyControllerProvider';
import { getActiveJourneyDestination } from '../journey/journeyController';
import { isJourneyDestinationResolvable } from '../journey/journeyPageRegistry';
import './FeatureMobileShortcuts.css';

export function FeatureMobileShortcuts() {
  const controller = useJourneyController();
  const snapshot = useJourneySnapshot();
  const destination = getActiveJourneyDestination(snapshot);
  const activeModuleId = destination.kind === 'feature' ? destination.moduleId : null;
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibraryDefinition | null>(null);
  const [message, setMessage] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const modules = useMemo(() => MODULE_REGISTRY, []);
  const selectedModules = selectedLibrary
    ? selectedLibrary.moduleIds
      .map((id) => modules.find((module) => module.id === id))
      .filter((module): module is RetailModule => Boolean(module))
    : [];

  useEffect(() => {
    if (!selectedLibrary) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLibrary(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedLibrary]);

  const returnHome = async () => {
    setMessage('');
    const moved = await controller.dispatch({ kind: 'pop' });
    if (!moved) setMessage('Chưa thể rời chức năng lúc này. Hãy hoàn tất hoặc đóng thao tác đang chạy trước.');
  };

  const openModule = async (module: RetailModule) => {
    if (!isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id })) {
      setMessage('Chức năng này đang được tích hợp và chưa thể mở.');
      return;
    }
    if (module.id === activeModuleId) {
      setSelectedLibrary(null);
      return;
    }
    setMessage('');
    const moved = await controller.dispatch({ kind: 'push', destination: { kind: 'feature', moduleId: module.id } });
    if (moved) setSelectedLibrary(null);
    else setMessage('Chưa thể chuyển chức năng. Hãy xử lý thao tác đang chạy trước.');
  };

  return (
    <>
      <nav className="feature-mobile-shortcuts" aria-label="Lối tắt chức năng">
        <button type="button" className="feature-mobile-shortcut" aria-label="Về trang chủ" title="Trang chủ" onClick={() => { void returnHome(); }}>
          <Home size={22} strokeWidth={2.1} />
          <span>Trang chủ</span>
        </button>
        <button type="button" className="feature-mobile-shortcut" aria-label="Mở thư viện nghiệp vụ" title="Thư viện nghiệp vụ" onClick={() => { setMessage(''); setSelectedLibrary(MODULE_LIBRARIES[0] ?? null); }}>
          <LibraryBig size={22} strokeWidth={2.1} />
          <span>Thư viện</span>
        </button>
      </nav>
      {message && <p className="feature-mobile-shortcuts__status" role="status">{message}</p>}
      {selectedLibrary && (
        <div className="feature-library-backdrop" role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedLibrary(null);
        }}>
          <section className="feature-library-sheet" role="dialog" aria-modal="true" aria-labelledby="feature-library-title">
            <header className="feature-library-sheet__header">
              <div className="feature-library-sheet__identity">
                <span className="feature-library-sheet__icon"><LibraryBig size={21} /></span>
                <div><span>RETAILOS · THƯ VIỆN NGHIỆP VỤ</span><h2 id="feature-library-title">Chọn nhóm chức năng</h2></div>
              </div>
              <button ref={closeButtonRef} type="button" className="feature-library-sheet__close" aria-label="Đóng thư viện" onClick={() => setSelectedLibrary(null)}><X size={20} /></button>
            </header>
            <div className="feature-library-sheet__groups" aria-label="Nhóm chức năng">
              {MODULE_LIBRARIES.map((library) => {
                const Icon = getLibraryIcon(library.id);
                return <button key={library.id} type="button" className={`feature-library-group tone-${library.tone}`} aria-pressed={selectedLibrary.id === library.id} onClick={() => { setSelectedLibrary(library); setMessage(''); }}>
                  <span className="feature-library-group__icon"><Icon size={19} /></span>
                  <span><strong>{library.title}</strong><small>{library.description}</small></span>
                  <ChevronRight size={17} />
                </button>;
              })}
            </div>
            <div className="feature-library-sheet__modules">
              <div className="feature-library-sheet__section-title"><strong>{selectedLibrary.title}</strong><span>{selectedModules.length} chức năng</span></div>
              {selectedModules.map((module) => {
                const Icon = getModuleIcon(module.id);
                const available = isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id });
                const active = module.id === activeModuleId;
                return <button key={module.id} type="button" className={`feature-library-module tone-${module.tone}`} disabled={!available || active} onClick={() => { void openModule(module); }}>
                  <span className="feature-library-module__icon"><Icon size={19} /></span>
                  <span className="feature-library-module__copy"><strong>{module.title}</strong><small>{module.description}</small><em>{active ? 'Đang mở' : available ? 'Đã triển khai' : 'Đang tích hợp'}</em></span>
                  <ChevronRight size={17} />
                </button>;
              })}
            </div>
            {message && <p className="feature-library-sheet__message" role="status">{message}</p>}
            <footer className="feature-library-sheet__footer"><ArrowLeft size={14} /> Trạng thái công việc hiện tại được giữ theo phiên điều hướng</footer>
          </section>
        </div>
      )}
    </>
  );
}
