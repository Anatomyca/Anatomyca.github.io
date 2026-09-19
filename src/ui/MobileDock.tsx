import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemRail } from './SystemRail';
import { ModelPicker } from './ModelPicker';
import { StructureList } from './StructureList';
import { DetailSheet } from './DetailSheet';
import { Controls } from './Controls';
import { About } from './About';
import { useAtlas } from '../state/store';

type Panel = 'models' | 'systems' | 'detail' | 'tools' | 'about' | null;

/**
 * The phone layout.
 *
 * Below the tablet breakpoint there is no room for three panes, and the
 * previous layout simply hid the system rail — which meant a reader on a
 * phone could not switch systems at all, the single most important control
 * in the atlas. Here each pane becomes a sheet raised from a bottom bar, so
 * the body keeps the whole screen until something is asked for.
 */
export function MobileDock() {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<Panel>(null);
  const selected = useAtlas((s) => s.selected);
  const studyModel = useAtlas((s) => s.studyModel);

  // Short labels: the full words are long enough in Sinhala and Tamil to
  // break mid-word in a third-of-a-screen tab. Sheet headings use the full
  // word, where there is room for it.
  const tabs: {
    id: Exclude<Panel, null>; label: string; heading: string; icon: ReactNode;
  }[] = [
    { id: 'models', label: t('dockModels'), heading: t('models'), icon: <BodyIcon /> },
    { id: 'systems', label: t('dockSystems'), heading: studyModel ? t('parts') : t('systems'), icon: <LayersIcon /> },
    { id: 'detail', label: t('dockDetail'), heading: t('names'), icon: <InfoIcon /> },
    { id: 'tools', label: t('dockTools'), heading: t('dockTools'), icon: <SlidersIcon /> },
    { id: 'about', label: t('dockAbout'), heading: t('about'), icon: <CreditsIcon /> },
  ];

  return (
    <>
      {panel && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 max-h-[62vh] overflow-y-auto
                     rounded-t-2xl border-t border-edge bg-panel/95 pb-16 backdrop-blur"
          role="dialog"
          aria-label={tabs.find((tab) => tab.id === panel)?.heading}
        >
          <div className="sticky top-0 flex items-center justify-between gap-2
                          border-b border-edge bg-panel/95 px-4 py-2 backdrop-blur">
            <h2 className="min-w-0 truncate text-sm font-medium">
              {tabs.find((tab) => tab.id === panel)?.heading}
            </h2>
            <button
              onClick={() => setPanel(null)}
              className="compact shrink-0 rounded border border-edge px-3 text-sm text-muted"
            >
              {t('close')}
            </button>
          </div>
          {panel === 'models' && <ModelPicker />}
          {panel === 'systems' && (studyModel ? <StructureList /> : <SystemRail />)}
          {panel === 'detail' && <DetailSheet />}
          {panel === 'tools' && <Controls variant="panel" />}
          {panel === 'about' && <About />}
        </div>
      )}

      <nav
        className="absolute inset-x-0 bottom-0 z-30 flex border-t border-edge bg-ground/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label={t('more')}
      >
        {tabs.map((tab) => {
          const open = panel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPanel(open ? null : tab.id)}
              aria-pressed={open}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px]
                          ${open ? 'text-carmine' : 'text-muted'}`}
            >
              {tab.icon}
              <span className="w-full truncate text-center leading-tight">{tab.label}</span>
              {tab.id === 'detail' && selected && !open && (
                <span className="sr-only">{t('bookmarked')}</span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

/* Simple inline icons: no icon dependency for three glyphs. */
const stroke = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

function CreditsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
      <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4" />
    </svg>
  );
}

function BodyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="4.5" r="2.5" /><path d="M12 7v8M12 15l-3 6M12 15l3 6M7 10h10" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
      <path d="M12 3 3 8l9 5 9-5-9-5ZM3 14l9 5 9-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...stroke}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />
    </svg>
  );
}
