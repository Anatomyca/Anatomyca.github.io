import type { Language } from '../domain/types';
import { SEED_STRUCTURES } from '../data/structures';
import type { Bp3dPart } from './manifest';
import variantData from '../data/name-variants.json';

/**
 * Sinhala and Tamil names for BodyParts3D structures.
 *
 * The upstream dataset carries English FMA names only. This project already
 * holds trilingual names for the major structures, so those are matched onto
 * the corresponding concepts here and everything else falls back to English.
 *
 * That fallback is honest, not a gap being hidden: with 2,234 element meshes
 * and 3,432 concepts, full review in two languages is a multi-year job. The
 * interface shows which tier a name belongs to, and only a named reviewer
 * may promote one. Matching is by English name, normalised, because the 2013
 * FMA ids in this release do not all survive into current Wikidata.
 */

export interface LocalNames {
  readonly si?: string;
  readonly ta?: string;
  readonly la?: string;
  readonly tier: 1 | 2 | 3;
}

/** Upstream wordings that denote the same structure as a seed entry. */
const VARIANTS: Record<string, readonly string[]> = variantData.variants;

const normalise = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();


/** English name (and common variants) -> the seed structure holding names. */
const BY_ENGLISH = new Map<string, LocalNames>();

for (const seed of SEED_STRUCTURES) {
  const entry: LocalNames = {
    ...(seed.names.si ? { si: seed.names.si } : {}),
    ...(seed.names.ta ? { ta: seed.names.ta } : {}),
    ...(seed.names.la ? { la: seed.names.la } : {}),
    tier: seed.tier,
  };
  BY_ENGLISH.set(normalise(seed.names.en), entry);
  // A few upstream names differ in number or wording from ours.
  for (const variant of VARIANTS[seed.id] ?? []) {
    BY_ENGLISH.set(normalise(variant), entry);
  }
}

export function localNamesFor(part: Bp3dPart): LocalNames | undefined {
  return BY_ENGLISH.get(normalise(part.name));
}

/** The same lookup for a concept, which carries only a name. */
export function localNamesForName(name: string): LocalNames | undefined {
  return BY_ENGLISH.get(normalise(name));
}

/** Display name in the reader's language, falling back to English. */
export function displayName(part: Bp3dPart, lang: Language): string {
  if (lang === 'en') return part.name;
  const local = localNamesFor(part);
  return local?.[lang] ?? part.name;
}
