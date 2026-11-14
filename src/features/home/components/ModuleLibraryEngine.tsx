import { memo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { ModuleLibraryDefinition, RetailModule } from '../moduleRegistry';
import { GlassSurface } from '../../../shared/components/glass';
import { MotionCard } from '../../../shared/motion';
import { getLibraryIcon, getModuleIcon, MotionIcon } from '../../../shared/icons';

type LibraryGroup = ModuleLibraryDefinition & { modules: RetailModule[] };

type Props = {
  groups: LibraryGroup[];
  onOpen: (group: ModuleLibraryDefinition, trigger: HTMLButtonElement) => void;
};

export const ModuleLibraryEngine = memo(function ModuleLibraryEngine({ groups, onOpen }: Props) {
  return (
    <div className="library-engine" aria-label="Nhóm chức năng">
      {groups.map((group, index) => {
        const GroupIcon = getLibraryIcon(group.id);
        return (
          <MotionCard key={group.id}>
            <GlassSurface
              as="button"
              material="soft"
              interactive
              type="button"
              className={`library-engine__group library-engine__tone-${group.tone}`}
              aria-label={`Mở thư viện ${group.title}, ${group.modules.length} chức năng`}
              onClick={(event) => onOpen({
                id: group.id,
                title: group.title,
                description: group.description,
                tone: group.tone,
                moduleIds: group.moduleIds,
              }, event.currentTarget)}
            >
              <span className="library-engine__glow" aria-hidden="true" />
              <span className="library-engine__head">
                <span className="library-engine__icon"><MotionIcon icon={GroupIcon} variant="module" size={23} /></span>
                <span className="library-engine__count">
                  <span>NHÓM {String(index + 1).padStart(2, '0')}</span>
                  <strong>{group.modules.length} chức năng</strong>
                </span>
              </span>
              <span className="library-engine__title">{group.title}</span>
              <span className="library-engine__description">{group.description}</span>
              <span className="library-engine__modules">
                {group.modules.map((module) => {
                  const ModuleIcon = getModuleIcon(module.id);
                  return (
                    <span key={module.id}>
                      <MotionIcon icon={ModuleIcon} variant="module" size={14} />
                      {module.title}
                    </span>
                  );
                })}
              </span>
              <span className="library-engine__footer">
                <span>Mở thư viện</span>
                <ArrowUpRight size={16} aria-hidden={true} />
              </span>
            </GlassSurface>
          </MotionCard>
        );
      })}
    </div>
  );
});
