import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';
import { GradeBadge } from './GradeBadge';
import { shareUrl } from '../state/deepLink';
import { BP3D_GRADE, BP3D_SOURCE } from '../atlas/manifest';
import { localNamesForName } from '../atlas/names';
import { BP3D_SYSTEM_BY_ID } from '../atlas/systems';
import { breadcrumbFor } from '../atlas/selection';
import { sentenceCase } from './text';

/**
 * The detail panel.
 *
 * A reader tapping the body lands on an element mesh, but the term they are
 * studying is usually the organ that contains it. So an element always shows
 * the concepts it belongs to, one tap away — that is the bridge between how
 * the data is shaped and how anatomy is taught.
 */
export function DetailSheet() {
  const { t, i18n } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const selectedId = useAtlas((s) => s.selected);
  const index = useAtlas((s) => s.index);
  const selection = useAtlas((s) => s.selection)();
  const select = useAtlas((s) => s.select);
  const bookmarks = useAtlas((s) => s.bookmarks);
  const toggleBookmark = useAtlas((s) => s.toggleBookmark);

  if (!selection || !index || !selectedId) {
    return (
      <section className="p-5" aria-live="polite">
        <h2 className="font-serif text-2xl">{t('emptyTitle')}</h2>
        <p className="mt-2 max-w-prose text-muted">{t('emptyBody')}</p>
      </section>
    );
  }

  const local = localNamesForName(selection.name);
  const system = BP3D_SYSTEM_BY_ID.get(selection.system);
  const heading = sentenceCase((lang !== 'en' && local?.[lang]) || selection.name);
  const untranslated = lang !== 'en' && !local?.[lang];

  const parents = selection.kind === 'element'
    ? breadcrumbFor(index, selection.id).slice(0, 6)
    : [];

  const triangles = selection.elements.reduce(
    (sum, id) => sum + (index.parts.get(id)?.indexCount ?? 0) / 3, 0);

  return (
    <section className="flex flex-col gap-4 p-5" aria-live="polite">
      <header>
        <h2 className="font-serif text-2xl leading-tight">{heading}</h2>
        <p className="mt-0.5 text-sm text-muted">
          {system ? (system.names[lang] ?? system.names.en) : selection.system}
          {selection.kind === 'concept' && ` · ${selection.elements.length} ${t('parts')}`}
        </p>
      </header>

      <GradeBadge grade={BP3D_GRADE} source={BP3D_SOURCE} />

      {untranslated && (
        <p className="rounded border border-amber-700/50 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
          {t('provisional')}
        </p>
      )}

      <div>
        <h3 className="mb-1 text-sm font-medium text-muted">{t('names')}</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {([
            ['English', sentenceCase(selection.name), 'en'],
            ['සිංහල', local?.si, 'si'],
            ['தமிழ்', local?.ta, 'ta'],
            ['Latin', local?.la, 'la'],
          ] as const).map(([label, value, code]) => value ? (
            <div key={code} className="contents">
              <dt className="text-muted" lang={code}>{label}</dt>
              <dd lang={code} className={code === 'la' ? 'italic' : undefined}>{value}</dd>
            </div>
          ) : null)}
        </dl>
      </div>

      {parents.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted">{t('partOf')}</h3>
          <div className="flex flex-wrap gap-2">
            {parents.map((concept) => (
              <button
                key={concept.id}
                onClick={() => select(concept.id)}
                className="compact rounded border border-edge px-3 py-1 text-left text-sm hover:border-carmine"
              >
                {sentenceCase((lang !== 'en' && localNamesForName(concept.name)?.[lang]) || concept.name)}
              </button>
            ))}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">{selection.kind === 'concept' ? 'FMA' : 'Mesh'}</dt>
        <dd className="font-mono text-xs">{selection.id}</dd>
        <dt className="text-muted">Triangles</dt>
        <dd className="tabular-nums">{Math.round(triangles).toLocaleString()}</dd>
      </dl>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => toggleBookmark(selection.id)}
          className="rounded border border-edge px-3 py-2 text-sm hover:border-saffron"
          aria-pressed={bookmarks.has(selection.id)}
        >
          {bookmarks.has(selection.id) ? t('bookmarked') : t('bookmark')}
        </button>
        <button
          onClick={() => {
            const url = shareUrl({ structure: selection.id, lang: i18n.language as never });
            if (navigator.share) void navigator.share({ title: selection.name, url });
            else void navigator.clipboard?.writeText(url);
          }}
          className="rounded border border-edge px-3 py-2 text-sm hover:border-saffron"
        >
          {t('share')}
        </button>
      </div>
    </section>
  );
}
