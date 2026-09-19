import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';

/**
 * Every named structure in the active study model.
 *
 * The whole body is navigated by system and search, because 2,234 structures
 * do not fit a list. A study model does: 144 bones is a page a student can
 * read straight down, which is how anatomy is actually revised.
 */
export function StructureList() {
  const { t } = useTranslation();
  const model = useAtlas((s) => s.studyModel);
  const selected = useAtlas((s) => s.selected);
  const select = useAtlas((s) => s.select);

  if (!model) return null;

  return (
    <nav aria-label={t('parts')} className="flex flex-col gap-0.5 p-2">
      {model.structures.map((structure) => {
        const active = selected === structure.id;
        return (
          <button
            key={structure.id}
            onClick={() => select(structure.id, { focus: true })}
            aria-pressed={active}
            className={`rounded px-3 py-2 text-left leading-snug transition-colors
                        ${active ? 'bg-panel text-carmine' : 'text-bone hover:bg-panel'}`}
          >
            {structure.name}
          </button>
        );
      })}
    </nav>
  );
}
