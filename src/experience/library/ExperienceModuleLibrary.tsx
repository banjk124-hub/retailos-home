import { memo, useMemo, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { MODULE_LIBRARIES, MODULE_REGISTRY, type ModuleLibraryDefinition, type ModuleLibraryGroup, type RetailModule } from '../../features/home/moduleRegistry';
import { getLibraryIcon, MotionIcon } from '../../shared/icons';

type Props = {
  initialSearch: string;
  onSearchChange: (search: string) => void;
  onOpen: (library: ModuleLibraryDefinition, modules: RetailModule[], trigger: HTMLButtonElement) => void;
};

export const ExperienceModuleLibrary = memo(function ExperienceModuleLibrary({ initialSearch, onSearchChange, onOpen }: Props) {
  const [search, setSearch] = useState(initialSearch);
  const filteredModules = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return MODULE_REGISTRY.filter((module) => !query || `${module.title} ${module.description} ${module.group}`.toLocaleLowerCase('vi').includes(query));
  }, [search]);
  const groups = useMemo(() => MODULE_LIBRARIES.map((library): ModuleLibraryGroup => ({
    ...library,
    modules: filteredModules.filter((module) => library.moduleIds.includes(module.id)),
  })).filter((library) => library.modules.length > 0), [filteredModules]);
  const updateSearch = (value: string) => { setSearch(value); onSearchChange(value); };

  return (
    <section className="retailos-library" id="modules" aria-labelledby="retailos-library-title">
      <header className="retailos-library__heading">
        <div><span className="retailos-library__eyebrow">FUNCTION CATALOGUE</span><h2 id="retailos-library-title">Thư viện nghiệp vụ</h2><p>Nhóm công cụ theo quy trình vận hành</p></div>
        <div className="retailos-library__summary"><strong>{filteredModules.length}</strong><span>chức năng</span><i /><strong>{groups.length}</strong><span>nhóm</span></div>
      </header>
      <label className="retailos-library__search">
        <Search size={17} aria-hidden="true" />
        <input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Tìm theo tên chức năng hoặc nghiệp vụ…" aria-label="Tìm trong thư viện nghiệp vụ" />
        {search && <button type="button" onClick={() => updateSearch('')} aria-label="Xóa tìm kiếm"><X size={16} /></button>}
      </label>
      {groups.length ? <div className="retailos-library__grid">
        {groups.map((group, index) => {
          const Icon = getLibraryIcon(group.id);
          const readyCount = group.modules.filter((module) => module.availability === 'ready').length;
          return <button key={group.id} type="button" className={`retailos-library__card tone-${group.tone}`} aria-label={`Mở thư viện ${group.title}, ${group.modules.length} chức năng`} onClick={(event) => onOpen(group, group.modules, event.currentTarget)}>
            <span className="retailos-library__card-top"><span className="retailos-library__icon"><MotionIcon icon={Icon} variant="module" size={22} /></span><span className="retailos-library__index">0{index + 1}</span></span>
            <span className="retailos-library__title">{group.title}</span>
            <span className="retailos-library__description">{group.description}</span>
            <span className="retailos-library__module-tags">{group.modules.map((module) => <span key={module.id}>{module.title}</span>)}</span>
            <span className="retailos-library__card-bottom"><span>{group.modules.length} chức năng · {readyCount} sẵn sàng</span><ArrowUpRight size={17} /></span>
          </button>;
        })}
      </div> : <div className="retailos-library__empty"><Search size={20} /><strong>Không tìm thấy chức năng phù hợp</strong><span>Thử một từ khóa khác.</span></div>}
    </section>
  );
});
