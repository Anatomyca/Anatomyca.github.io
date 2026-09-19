import MiniSearch, { type SearchResult } from 'minisearch';
import type { Language } from '../domain/types';
import type { Bp3dConcept, Bp3dPart } from '../atlas/manifest';
import { localNamesFor, localNamesForName } from '../atlas/names';
import { matchForms, normalise, romanKey } from './normalise';

/**
 * Offline search across all three scripts at once.
 *
 * A query is matched against the English name, the Sinhala and Tamil names
 * where they exist, the Latin term, the FMA concept id and the mesh id — so
 * a Tamil-medium student searching in Tamil and a medical student searching
 * by FMA id both land on the same structure. The romanised skeleton is a
 * separate low-weighted field, so a phonetic guess can find a structure but
 * never outranks an exact name match.
 */
interface IndexedPart {
  id: string;
  label: string;
  kind: 'concept' | 'element';
  /** How many meshes this entry covers; concepts gather many. */
  size: number;
  /** Grouping this project derived rather than took from the licensor. */
  derived: boolean;
  /** Normalised name, kept for exact-match ranking. */
  exact: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  latin: string;
  roman: string;
  concept: string;
  system: string;
}

const FIELDS = ['name_en', 'name_si', 'name_ta', 'latin', 'roman', 'concept', 'id'] as const;

const BOOSTS: Record<string, number> = {
  name_en: 4, name_si: 4, name_ta: 4, latin: 2, concept: 3, id: 3, roman: 0.5,
};

function romanise(values: readonly string[]): string {
  const keys = new Set<string>();
  for (const value of values) {
    for (const word of normalise(value).split(' ')) {
      const key = romanKey(word);
      if (key) keys.add(key);
    }
  }
  return [...keys].join(' ');
}

function toDocument(part: Bp3dPart, lang: Language): IndexedPart {
  const local = localNamesFor(part);
  return {
    id: part.id,
    label: (lang !== 'en' && local?.[lang]) || part.name,
    kind: 'element',
    size: 1,
    derived: false,
    exact: normalise(part.name),
    name_en: normalise(part.name),
    name_si: normalise(local?.si ?? ''),
    name_ta: normalise(local?.ta ?? ''),
    latin: normalise(local?.la ?? ''),
    roman: romanise([part.name, local?.la ?? ''].filter(Boolean)),
    concept: normalise(part.conceptId),
    system: part.system,
  };
}

export interface AtlasSearch {
  search(query: string, limit?: number): SearchResult[];
}

/**
 * Concepts are what students search for. "Heart" has no mesh of its own — it
 * is a concept gathering 83 element meshes — so an index of elements alone
 * would fail the most obvious query in the atlas.
 */
function conceptDocument(concept: Bp3dConcept, lang: Language): IndexedPart {
  const local = localNamesForName(concept.name);
  return {
    id: concept.id,
    label: (lang !== 'en' && local?.[lang]) || concept.name,
    kind: 'concept',
    size: concept.elements.length,
    derived: Boolean(concept.derived),
    exact: normalise(concept.name),
    name_en: normalise(concept.name),
    name_si: normalise(local?.si ?? ''),
    name_ta: normalise(local?.ta ?? ''),
    latin: normalise(local?.la ?? ''),
    roman: romanise([concept.name, local?.la ?? ''].filter(Boolean)),
    concept: normalise(concept.id),
    system: '',
  };
}

export function buildSearch(
  parts: readonly Bp3dPart[],
  lang: Language,
  concepts: readonly Bp3dConcept[] = [],
): AtlasSearch {
  const mini = new MiniSearch<IndexedPart>({
    fields: [...FIELDS],
    storeFields: ['id', 'label', 'system', 'kind', 'size', 'derived', 'exact'],
    searchOptions: { boost: BOOSTS, prefix: true, fuzzy: 0.2 },
    // Names are pre-normalised at index time; queries take the same path
    // below, so the two sides always agree.
    processTerm: (term) => term,
  });
  mini.addAll([
    ...concepts.map((c) => conceptDocument(c, lang)),
    ...parts.map((p) => toDocument(p, lang)),
  ]);

  return {
    search(q, limit = 12) {
      const forms = matchForms(q);
      if (forms.length === 0) return [];
      const seen = new Set<string>();
      const out: SearchResult[] = [];
      for (const form of forms) {
        for (const hit of mini.search(form)) {
          const id = hit.id as string;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push(hit);
        }
      }
      // Term frequency alone puts "side of heart" above "heart", because
      // both match and the shorter field scores well. What a reader typing
      // "heart" wants is the thing actually called that, so an exact name
      // match outranks everything, then a name that starts with the query.
      const query = normalise(q);
      const bias = (r: SearchResult): number => {
        const name = (r['exact'] as string | undefined) ?? '';
        let weight = r['kind'] === 'concept' ? 1.15 : 1;
        if (name === query) weight *= 6;
        else if (name.startsWith(`${query} `)) weight *= 1.5;
        // A grouping this project derived is a convenience, not a name the
        // licensor gave, so it yields to a real one of equal strength.
        if (r['derived']) weight *= 0.92;
        return weight;
      };
      return out.sort((a, b) => b.score * bias(b) - a.score * bias(a)).slice(0, limit);
    },
  };
}

/**
 * Search within a study model.
 *
 * These carry plain English mesh names and no translations, so the index is
 * small and the matching simple — a substring and a romanised skeleton is
 * enough for 144 bones, where the whole body needs a real inverted index.
 */
export function buildStudySearch(
  structures: readonly { id: string; name: string }[],
): AtlasSearch {
  const rows = structures.map((s) => ({
    id: s.id,
    label: s.name,
    haystack: normalise(s.name),
    roman: romanKey(normalise(s.name).replace(/\s+/g, '')),
  }));

  return {
    search(query, limit = 12) {
      const q = normalise(query);
      if (!q) return [];
      const key = romanKey(q.replace(/\s+/g, ''));
      const scored = rows
        .map((row) => {
          let score = 0;
          if (row.haystack === q) score = 100;
          else if (row.haystack.startsWith(q)) score = 60;
          else if (row.haystack.includes(q)) score = 40;
          else if (key && row.roman.includes(key)) score = 10;
          return { row, score };
        })
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score || a.row.label.localeCompare(b.row.label))
        .slice(0, limit);

      return scored.map(({ row, score }) => ({
        id: row.id, score, label: row.label,
        terms: [], queryTerms: [], match: {},
      })) as unknown as SearchResult[];
    },
  };
}
