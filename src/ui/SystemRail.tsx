import { useTranslation } from 'react-i18next';
import { SEED_STRUCTURES, SYSTEMS } from '../data/structures';
import { useAtlas } from '../state/store';

/** Turn body systems on and off, to go from skin to skeleton. */
export function SystemRail() {
  const { t } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const hidden = useAtlas((s) => s.hidden);
  const toggleSystem = useAtlas((s) => s.toggleSystem);

  return (
    <nav aria-label={t('systems')} className="flex flex-col gap-1 p-2">
      {SYSTEMS.map((system) => {
        const on = !hidden.has(system.id);
        const count = SEED_STRUCTURES.filter((s) => s.system === system.id).length;
        return (
          <button
            key={system.id}
            onClick={() => toggleSystem(system.id, !on)}
            aria-pressed={on}
            className={`flex items-center gap-3 rounded px-3 py-2 text-left transition-colors
                        ${on ? 'text-bone' : 'text-muted'} hover:bg-panel`}
          >
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm border border-edge"
              style={{ background: on ? system.colour : 'transparent' }}
            />
            <span className="flex-1">{system.names[lang] ?? system.names.en}</span>
            <span className="text-xs text-muted tabular-nums">{count}</span>
          </button>
        );
      })}
    </nav>
  );
}
