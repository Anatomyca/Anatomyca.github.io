import { useTranslation } from 'react-i18next';
import { BP3D_SYSTEMS } from '../atlas/systems';
import { useAtlas } from '../state/store';

/**
 * Turn body systems on and off, to go from skin to skeleton.
 *
 * Each system is a separate download, so the count beside it is not
 * decoration: it tells a reader on a prepaid package what they are asking
 * for before they ask for it.
 */
export function SystemRail() {
  const { t } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const manifest = useAtlas((s) => s.manifest);
  const shown = useAtlas((s) => s.shown);
  const loading = useAtlas((s) => s.loading);
  const setSystemShown = useAtlas((s) => s.setSystemShown);

  const counts = new Map<string, number>();
  for (const part of manifest?.parts ?? []) {
    counts.set(part.system, (counts.get(part.system) ?? 0) + 1);
  }

  return (
    <nav aria-label={t('systems')} className="flex flex-col gap-0.5 p-2">
      {BP3D_SYSTEMS.map((system) => {
        const on = shown.has(system.id);
        const busy = loading.has(system.id);
        const count = counts.get(system.id) ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={system.id}
            onClick={() => setSystemShown(system.id, !on)}
            aria-pressed={on}
            aria-busy={busy}
            className={`flex items-center gap-3 rounded px-3 py-2 text-left transition-colors
                        ${on ? 'text-bone' : 'text-muted'} hover:bg-panel`}
          >
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-sm border border-edge"
              style={{ background: on ? system.colour : 'transparent' }}
            />
            <span className="flex-1 leading-snug">{system.names[lang] ?? system.names.en}</span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {busy ? '…' : count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
