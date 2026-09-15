import MiniSearch, { type SearchResult } from 'minisearch';
import type { Language, Structure } from '../domain/types';
import { matchForms, normalise, romanKey } from './normalise';

/**
 * Offline search across all three scripts at once.
 *
 * A query is matched against the name in every language, the everyday
 * aliases, the Latin term and the concept ID — so a Tamil-medium student
 * searching in Tamil and a medical student searching by FMA ID both land on
 * the same structure. The romanised skeleton is a separate low-weighted
 * field, so a phonetic guess can find a structure but never outranks an
 * exact name match.
 */
interface IndexedStructure {
  id: string;
  /** Display name in the active language, for rendering results. */
  label: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  latin: string;
  aliases: string;
  roman: string;
  system: string;
}

const FIELDS = ['name_en', 'name_si', 'name_ta', 'latin', 'aliases', 'roman', 'id'] as const;

/** Exact names outrank everyday aliases, which outrank phonetic guesses. */
const BOOSTS: Record<string, number> = {
  name_en: 4, name_si: 4, name_ta: 4, latin: 2, aliases: 2, id: 2, roman: 0.5,
};

function romanise(values: readonly string[]): string {
  const keys = new Set<string>();
  for (const v of values) {
    for (const part of normalise(v).split(' ')) {
      const key = romanKey(part);
      if (key) keys.add(key);
    }
  }
  return [...keys].join(' ');
}

function toDocument(s: Structure, lang: Language): IndexedStructure {
  const aliasList = [
    ...(s.aliases?.si ?? []), ...(s.aliases?.ta ?? []), ...(s.aliases?.en ?? []),
  ];
  const romanList = [
    ...(s.aliases?.['si-Latn'] ?? []), ...(s.aliases?.['ta-Latn'] ?? []),
    s.names.en, s.names.la ?? '',
  ];
  return {
    id: s.id,
    label: s.names[lang] ?? s.names.en,
    name_en: normalise(s.names.en),
    name_si: normalise(s.names.si ?? ''),
    name_ta: normalise(s.names.ta ?? ''),
    latin: normalise(s.names.la ?? ''),
    aliases: aliasList.map((a) => normalise(a)).join(' '),
    roman: romanise(romanList.filter(Boolean)),
    system: s.system,
  };
}

export interface AtlasSearch {
  search(query: string, limit?: number): SearchResult[];
}

export function buildSearch(structures: readonly Structure[], lang: Language): AtlasSearch {
  const mini = new MiniSearch<IndexedStructure>({
    fields: [...FIELDS],
    storeFields: ['id', 'label', 'system'],
    searchOptions: { boost: BOOSTS, prefix: true, fuzzy: 0.2 },
    // Names are pre-normalised at index time; queries go through the same
    // path below, so the two sides always agree.
    processTerm: (term) => term,
  });
  mini.addAll(structures.map((s) => toDocument(s, lang)));

  return {
    search(query, limit = 12) {
      const forms = matchForms(query);
      if (forms.length === 0) return [];
      const seen = new Set<string>();
      const out: SearchResult[] = [];
      for (const form of forms) {
        for (const hit of mini.search(form)) {
          if (seen.has(hit.id as string)) continue;
          seen.add(hit.id as string);
          out.push(hit);
        }
      }
      return out.sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}
