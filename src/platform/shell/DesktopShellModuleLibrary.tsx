import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowUpRight, ChevronRight, LibraryBig } from 'lucide-react';
import { MODULE_LIBRARIES, MODULE_REGISTRY, type ModuleLibraryDefinition, type RetailModule } from '../../features/home/moduleRegistry';
import { getLibraryIcon, getModuleIcon } from '../../features/home/homeIconRegistry';
import { MotionIcon } from '../../shared/icons';
import { useJourneyController, useJourneySnapshot } from '../journey/JourneyControllerProvider';
import { getActiveJourneyDestination } from '../journey/journeyController';
import { isJourneyDestinationResolvable } from '../journey/journeyPageRegistry';
import './DesktopShellModuleLibrary.css';

type Props = {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

/** Compact Shell-owned flyout connected to the Desktop Dock Library control on Feature Pages. */
export function DesktopShellModuleLibrary({ triggerRef, onClose }: Props) {
  const controller = useJourneyController();
  const snapshot = useJourneySnapshot();
  const destination = getActiveJourneyDestination(snapshot);
  const activeModuleId = destination.kind === 'feature' ? destination.moduleId : null;
  const [selectedLibrary, setSelectedLibrary] = useState<ModuleLibraryDefinition>(
    () => MODULE_LIBRARIES.find((library) => activeModuleId && library.moduleIds.includes(activeModuleId)) ?? MODULE_LIBRARIES[0],
  );
  const [message, setMessage] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const firstGroupRef = useRef<HTMLButtonElement>(null);
  const [anchorTop, setAnchorTop] = useState(0);

  const modules = useMemo(() => selectedLibrary.moduleIds
    .map((id) => MODULE_REGISTRY.find((module) => module.id === id))
    .filter((module): module is RetailModule => Boolean(module)), [selectedLibrary]);

  useEffect(() => {
    const updateAnchor = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const halfPanel = (panelRef.current?.offsetHeight ?? 360) / 2;
        const center = rect.top + rect.height / 2;
        setAnchorTop(Math.max(halfPanel + 12, Math.min(center, window.innerHeight - halfPanel - 12)));
      }
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    firstGroupRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, triggerRef]);

  const openModule = async (module: RetailModule) => {
    if (!isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id }) || module.id === activeModuleId) return;
    setMessage('');
    const moved = await controller.dispatch({ kind: 'push', destination: { kind: 'feature', moduleId: module.id } });
    if (moved) onClose();
    else setMessage('Chưa thể chuyển chức năng. Hãy xử lý thao tác đang chạy trước.');
  };

  return (
    <section
      ref={panelRef}
      className="desktop-shell-library"
      style={{ top: anchorTop }}
      role="dialog"
      aria-label="Thư viện nghiệp vụ"
      aria-modal="false"
    >
      <header className="desktop-shell-library__header">
        <span className="desktop-shell-library__mark"><LibraryBig size={17} /></span>
        <div><strong>Thư viện nghiệp vụ</strong><small>Chọn nhóm để xem chức năng</small></div>
      </header>
      <div className="desktop-shell-library__tree">
        <nav className="desktop-shell-library__groups" aria-label="Nhóm nghiệp vụ">
          {MODULE_LIBRARIES.map((library, index) => {
            const Icon = getLibraryIcon(library.id);
            const selected = selectedLibrary.id === library.id;
            return (
              <button
                key={library.id}
                ref={index === 0 ? firstGroupRef : undefined}
                type="button"
                className={`desktop-shell-library__group${selected ? ' is-selected' : ''}`}
                aria-expanded={selected}
                onClick={() => { setSelectedLibrary(library); setMessage(''); }}
              >
                <span className="desktop-shell-library__group-icon"><MotionIcon icon={Icon} variant="module" active={selected} size={17} /></span>
                <span className="desktop-shell-library__group-label">{library.title}</span>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </nav>
        <div className="desktop-shell-library__branch" aria-label={`Chức năng thuộc nhóm ${selectedLibrary.title}`}>
          <div className="desktop-shell-library__branch-heading">
            <span>{selectedLibrary.title}</span>
            <small>{modules.length} chức năng</small>
          </div>
          <div className="desktop-shell-library__module-tree">
            {modules.map((module) => {
              const available = isJourneyDestinationResolvable({ kind: 'feature', moduleId: module.id });
              const active = module.id === activeModuleId;
              const Icon = getModuleIcon(module.id);
              return (
                <button
                  key={module.id}
                  type="button"
                  className="desktop-shell-library__module"
                  disabled={!available || active}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => { void openModule(module); }}
                >
                  <span className="desktop-shell-library__module-branch" aria-hidden="true" />
                  <span className="desktop-shell-library__module-icon"><MotionIcon icon={Icon} variant="module" size={17} /></span>
                  <span className="desktop-shell-library__module-copy">
                    <strong>{module.title}</strong>
                    <small>{active ? 'Đang mở' : available ? 'Sẵn sàng' : 'Đang tích hợp'}</small>
                  </span>
                  {available && !active && <ArrowUpRight size={15} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {message && <p className="desktop-shell-library__message" role="status">{message}</p>}
    </section>
  );
}
