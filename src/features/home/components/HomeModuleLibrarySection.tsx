import { useCallback, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ModuleLibraryEngine } from './ModuleLibraryEngine';
import { MODULE_LIBRARIES, MODULE_REGISTRY, type ModuleLibraryDefinition, type ModuleLibraryGroup, type RetailModule } from '../moduleRegistry';
import { MotionIcon } from '../../../shared/icons';

type Props = {
  initialSearch: string;
  onSearchChange: (search: string) => void;
  onOpen: (library: ModuleLibraryDefinition, modules: RetailModule[], trigger: HTMLButtonElement) => void;
};

export function HomeModuleLibrarySection({ initialSearch, onSearchChange, onOpen }: Props) {
  const [search, setSearch] = useState(initialSearch);
  const filteredModules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return MODULE_REGISTRY.filter((module) =>
      !query || `${module.title} ${module.description} ${module.group}`.toLocaleLowerCase('vi').includes(query),
    );
  }, [search]);
  const visibleLibraries = useMemo(() => MODULE_LIBRARIES
    .map((library): ModuleLibraryGroup => ({
      ...library,
      modules: filteredModules.filter((module) => library.moduleIds.includes(module.id)),
    }))
    .filter((library) => library.modules.length > 0), [filteredModules]);
  const handleOpen = useCallback((group: ModuleLibraryGroup, trigger: HTMLButtonElement) => {
    onOpen(group, group.modules, trigger);
  }, [onOpen]);

  const updateSearch = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  return (
    <section className="section-block app-library-section" id="modules">
      <div className="section-heading app-library-heading">
        <div className="module-heading-copy">
          <span className="library-eyebrow">KHÔNG GIAN CHỨC NĂNG</span>
          <h2>Thư viện nghiệp vụ</h2>
          <p>{filteredModules.length} chức năng trong {visibleLibraries.length} nhóm</p>
        </div>
        <label className="search-field home-search-field" aria-label="Tìm công cụ">
          <MotionIcon icon={Search} variant="search" active={Boolean(search)} size={17} />
          <input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Tìm chức năng..."
            aria-label="Tìm công cụ"
          />
          {search && (
            <button className="search-clear-button" type="button" onClick={() => updateSearch('')} aria-label="Xóa tìm kiếm">
              <MotionIcon icon={X} variant="search" active size={15} />
            </button>
          )}
        </label>
      </div>
      {visibleLibraries.length > 0 && <ModuleLibraryEngine groups={visibleLibraries} onOpen={handleOpen} />}
      {visibleLibraries.length === 0 && (
        <div className="empty-state app-library-empty">
          <Search size={22} />
          <strong>Không có kết quả</strong>
          <span>Thử từ khóa khác.</span>
        </div>
      )}
    </section>
  );
}
