import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Viewport } from './Viewport';
import { DetailSheet } from './DetailSheet';
import { SearchBox } from './SearchBox';
import { SystemRail } from './SystemRail';
import { LanguageSwitch } from './LanguageSwitch';
import { Controls } from './Controls';
import { useAtlas } from '../state/store';
import { loadBookmarks, saveBookmarks } from '../lk/offline/storage';

/**
 * Layout follows the viewport, per the mobile-first specification: under
 * 768px the body is full width with the detail sheet below it; from 768px a
 * side panel appears instead, so the model is never covered.
 */
export function App() {
  const { t } = useTranslation();
  const ready = useAtlas((s) => s.ready);
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
    <div className="flex h-full flex-col">
      <a href="#detail" className="sr-only focus:not-sr-only">Skip to details</a>

      <header className="flex shrink-0 items-center gap-3 border-b border-edge px-3 py-2">
        <h1 className="font-serif text-lg whitespace-nowrap">{t('appName')}</h1>
        <div className="min-w-0 flex-1"><SearchBox /></div>
        <LanguageSwitch />
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-edge md:block">
          <SystemRail />
        </aside>

        <main className="relative min-h-0 flex-1">
          <Viewport />
          {!ready && <BootOverlay />}
          {ready && loading.size > 0 && (
            <p className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border
                          border-edge bg-panel/90 px-3 py-1 text-xs text-muted backdrop-blur">
              {t('buildingBody')}…
            </p>
          )}
          <Controls />
        </main>

        <aside
          id="detail"
          className="max-h-[45vh] shrink-0 overflow-y-auto border-t border-edge
                     md:max-h-none md:w-80 md:border-l md:border-t-0 lg:w-96"
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
    <div className="absolute inset-0 grid place-content-center gap-3 bg-ground/90 text-center">
      <p className="font-serif text-xl">{t('appName')}</p>
      <div className="mx-auto h-1 w-48 overflow-hidden rounded bg-edge">
        <div className="h-full w-1/3 animate-pulse bg-carmine" />
      </div>
      <p className="text-sm text-muted">{t('buildingBody')}</p>
    </div>
  );
}
