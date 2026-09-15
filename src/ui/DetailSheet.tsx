import { useTranslation } from 'react-i18next';
import { useAtlas } from '../state/store';
import { GradeBadge } from './GradeBadge';
import { shareUrl } from '../state/deepLink';
import type { Structure } from '../domain/types';

/**
 * The detail panel. On a phone this is a bottom sheet; from the tablet
 * breakpoint up it becomes a side panel. Either way it never covers the
 * structure the reader just tapped.
 */
export function DetailSheet() {
  const { t, i18n } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const selectedId = useAtlas((s) => s.selected);
  const byId = useAtlas((s) => s.byId);
  const select = useAtlas((s) => s.select);
  const bookmarks = useAtlas((s) => s.bookmarks);
  const toggleBookmark = useAtlas((s) => s.toggleBookmark);

  const structure = selectedId ? byId(selectedId) : undefined;

  if (!structure) {
    return (
      <section className="p-5" aria-live="polite">
        <h2 className="font-serif text-2xl">{t('emptyTitle')}</h2>
        <p className="mt-2 max-w-prose text-muted">{t('emptyBody')}</p>
      </section>
    );
  }

  const name = structure.names[lang] ?? structure.names.en;
  const provisional = structure.status?.[lang] === 'provisional' && lang !== 'en';

  return (
    <section className="flex flex-col gap-4 p-5" aria-live="polite">
      <header>
        <h2 className="font-serif text-2xl leading-tight">{name}</h2>
        {structure.names.la && (
          <p className="text-sm italic text-muted" lang="la">{structure.names.la}</p>
        )}
      </header>

      <GradeBadge grade={structure.grade} source={structure.source} />

      {provisional && (
        <p className="rounded border border-amber-700/50 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
          {t('provisional')}
        </p>
      )}

      <NameList structure={structure} />

      {structure.blurb?.en && (
        <p className="max-w-prose leading-relaxed">{structure.blurb.en}</p>
      )}

      {structure.jobs?.en && structure.jobs.en.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted">{t('jobs')}</h3>
          <ul className="list-inside list-disc space-y-1">
            {structure.jobs.en.map((job) => <li key={job}>{job}</li>)}
          </ul>
        </div>
      )}

      {structure.context?.en && (
        <div className="rounded border border-edge bg-panel px-3 py-2">
          <h3 className="mb-1 text-sm font-medium text-saffron">{t('lk')}</h3>
          <p className="text-sm leading-relaxed">{structure.context.en}</p>
        </div>
      )}

      {structure.adjacent.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted">{t('nearby')}</h3>
          <div className="flex flex-wrap gap-2">
            {structure.adjacent.map((id) => {
              const near = byId(id);
              if (!near) return null;
              return (
                <button
                  key={id}
                  onClick={() => select(id)}
                  className="compact rounded border border-edge px-3 py-1 text-sm hover:border-carmine"
                >
                  {near.names[lang] ?? near.names.en}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => toggleBookmark(structure.id)}
          className="rounded border border-edge px-3 py-2 text-sm hover:border-saffron"
          aria-pressed={bookmarks.has(structure.id)}
        >
          {bookmarks.has(structure.id) ? t('bookmarked') : t('bookmark')}
        </button>
        <button
          onClick={() => {
            const url = shareUrl({ structure: structure.id, lang: i18n.language as never });
            if (navigator.share) void navigator.share({ title: name, url });
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

/** All three names together: the point of the atlas, so it leads the panel. */
function NameList({ structure }: { structure: Structure }) {
  const { t } = useTranslation();
  const rows: [string, string | undefined, string][] = [
    ['English', structure.names.en, 'en'],
    ['සිංහල', structure.names.si, 'si'],
    ['தமிழ்', structure.names.ta, 'ta'],
  ];
  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-muted">{t('names')}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value, code]) => value ? (
          <div key={code} className="contents">
            <dt className="text-muted" lang={code}>{label}</dt>
            <dd lang={code}>{value}</dd>
          </div>
        ) : null)}
      </dl>
    </div>
  );
}
