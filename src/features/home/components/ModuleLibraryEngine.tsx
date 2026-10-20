
import { ArrowUpRight, Boxes } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleDataId } from '../../data/moduleDataService';

type ModuleItem = {
  id: ModuleDataId;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  group: string;
  status?: string;
};

type LibraryGroup = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  moduleIds: ModuleDataId[];
  modules: ModuleItem[];
};

type Props = {
  groups: LibraryGroup[];
  onOpen: (
    group: Omit<LibraryGroup, 'modules'>,
    trigger: HTMLButtonElement,
  ) => void;
};

export function ModuleLibraryEngine({ groups, onOpen }: Props) {
  return (
    <div className="library-engine" aria-label="Nhóm chức năng">
      {groups.map((group, index) => {
        const GroupIcon = group.icon ?? Boxes;

        return (
          <button
            key={group.id}
            type="button"
            className={`library-engine__group library-engine__tone-${group.tone}`}
            aria-label={`Mở thư viện ${group.title}, ${group.modules.length} chức năng`}
            onClick={(event) => {
              const { modules: _modules, ...library } = group;
              onOpen(library, event.currentTarget);
            }}
          >
            <span className="library-engine__head">
              <span className="library-engine__icon">
                <GroupIcon size={23} aria-hidden={true} />
              </span>

              <span className="library-engine__count">
                <span>NHÓM {String(index + 1).padStart(2, '0')}</span>
                <strong>{group.modules.length} chức năng</strong>
              </span>
            </span>

            <span className="library-engine__title">{group.title}</span>

            <span className="library-engine__description">
              {group.description}
            </span>

            <span className="library-engine__modules">
              {group.modules.map((module) => {
                const ModuleIcon = module.icon;

                return (
                  <span key={module.id}>
                    <ModuleIcon size={14} aria-hidden={true} />
                    {module.title}
                  </span>
                );
              })}
            </span>

            <span className="library-engine__footer">
              <span>Xem nhóm</span>
              <ArrowUpRight size={16} aria-hidden={true} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
