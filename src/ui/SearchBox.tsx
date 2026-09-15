import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildSearch } from '../search/index';
import { useAtlas } from '../state/store';
import { sentenceCase } from './text';

/**
 * Trilingual search over every structure in the atlas.
 *
 * The index is rebuilt when the language changes so result labels follow the
 * reader, but matching always spans all three scripts plus romanised input —
 * a student who types "hadawatha" on an English keyboard finds the heart.
 */
export function SearchBox() {
  const { t } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const manifest = useAtlas((s) => s.manifest);
  const select = useAtlas((s) => s.select);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useMemo(
    () => (manifest ? buildSearch(manifest.parts, lang, manifest.concepts) : null),
    [manifest, lang],
  );
  const results = useMemo(
    () => (search && query.trim() ? search.search(query, 8) : []),
    [query, search],
  );

  function choose(id: string) {
    select(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative w-full" role="search">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setQuery(''); setOpen(false); }
          if (e.key === 'Enter' && results[0]) choose(results[0].id as string);
        }}
        placeholder={t('search')}
        aria-label={t('search')}
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        autoComplete="off"
        spellCheck={false}
        disabled={!search}
        className="w-full rounded-lg border border-edge bg-panel px-4 py-2 text-base
                   placeholder:text-muted focus:border-saffron focus:outline-none
                   disabled:opacity-50"
      />
      {open && query.trim() && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg
                     border border-edge bg-panel shadow-xl"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-muted">{t('noMatch')}</li>
          ) : results.map((hit) => (
            <li key={hit.id as string} role="option" aria-selected={false}>
              <button
                onClick={() => choose(hit.id as string)}
                className="w-full px-4 py-2 text-left hover:bg-edge"
              >
                {sentenceCase(hit['label'] as string)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
