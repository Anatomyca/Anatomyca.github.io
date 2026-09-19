import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Viewport } from './Viewport';
import { DetailSheet } from './DetailSheet';
import { SearchBox } from './SearchBox';
import { SystemRail } from './SystemRail';
import { ModelPicker } from './ModelPicker';
import { StructureList } from './StructureList';
import { LanguageSwitch } from './LanguageSwitch';
import { Controls } from './Controls';
import { MobileDock } from './MobileDock';
import { useAtlas } from '../state/store';
import { loadBookmarks, saveBookmarks } from '../lk/offline/storage';

/**
 * Layout follows the viewport.
 *
 * Under 768px the body gets the whole screen and every panel is raised from
 * the bottom bar; from 768px the three-pane layout appears. The header
 * stacks on a phone rather than competing for one row, because Sinhala and
 * Tamil labels run considerably longer than their English equivalents and a
 * single row forces the search field down to a few characters wide.
 */
export function App() {
  const { t } = useTranslation();
  const ready = useAtlas((s) => s.ready);
  const studyModel = useAtlas((s) => s.studyModel);
  const loading = useAtlas((s) => s.loading);
  const syncFromHash = useAtlas((s) => s.syncFromHash);
  const bookmarks = useAtlas((s) => s.bookmarks);
  const setBookmarks = useAtlas((s) => s.setBookmarks);

  // A pasted link must open on the right structure, in the right language.
  useEffect(() => {
    const onHash = () => syncFromHash(location.hash);
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [syncFromHash]);

  useEffect(() => { void loadBookmarks().then(setBookmarks); }, [setBookmarks]);
  useEffect(() => { void saveBookmarks([...bookmarks]); }, [bookmarks]);

  return (
    <div className="flex h-full flex-col overflow-x-hidden">
      <a href="#detail" className="sr-only focus:not-sr-only">Skip to details</a>

      <header
        className="grid shrink-0 gap-2 border-b border-edge px-3 py-2 md:flex md:items-center md:gap-3"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* md:contents dissolves this wrapper on wide screens so its children
            join the header row directly, ordered around the search field. */}
        <div className="flex min-w-0 items-center justify-between gap-2 md:contents">
          <h1 className="min-w-0 truncate font-serif text-lg md:order-1 md:shrink-0">
            {t('appName')}
          </h1>
          <div className="shrink-0 md:order-3"><LanguageSwitch /></div>
        </div>
        <div className="min-w-0 md:order-2 md:flex-1"><SearchBox /></div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-edge md:block">
          <ModelPicker />
          <div className="border-t border-edge">
            {studyModel ? <StructureList /> : <SystemRail />}
          </div>
        </aside>

        <main className="relative min-h-0 flex-1">
          <Viewport />
          {!ready && <BootOverlay />}
          {ready && loading.size > 0 && (
            <p className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] truncate rounded-full
                          border border-edge bg-panel/90 px-3 py-1 text-xs text-muted backdrop-blur">
              {t('buildingBody')}…
            </p>
          )}
          {/* Floating controls would cover the body on a phone, so there they
              live in the dock's tools sheet instead. */}
          <div className="hidden md:block"><Controls /></div>
          <div className="md:hidden"><MobileDock /></div>
        </main>

        <aside
          id="detail"
          className="hidden shrink-0 overflow-y-auto border-edge md:block md:w-80
                     md:border-l lg:w-96"
        >
          <DetailSheet />
        </aside>
      </div>
    </div>
  );
}

function BootOverlay() {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 grid place-content-center gap-3 bg-ground/90 px-6 text-center">
      <p className="font-serif text-xl">{t('appName')}</p>
      <div className="mx-auto h-1 w-40 max-w-full overflow-hidden rounded bg-edge">
        <div className="h-full w-1/3 animate-pulse bg-carmine" />
      </div>
      <p className="text-sm text-muted">{t('buildingBody')}</p>
    </div>
  );
}
