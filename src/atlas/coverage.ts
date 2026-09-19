import type { Language } from '../domain/types';
import data from '../data/coverage-notes.json';

/**
 * What each system does and does not contain.
 *
 * A student who switches on the nervous system and finds no sciatic nerve
 * should learn that the dataset omits it, not conclude that the atlas is
 * broken or — far worse — that the structure does not matter. Silence here
 * would be the least honest option available.
 */
export interface CoverageNote {
  readonly text: string;
  /** What source would close the gap, for anyone wanting to help. */
  readonly fills: string;
}

interface RawNote {
  readonly en: string;
  readonly si?: string;
  readonly ta?: string;
  readonly fills: string;
}

const NOTES = data.notes as Record<string, RawNote>;

export function coverageNote(system: string, lang: Language): CoverageNote | undefined {
  const note = NOTES[system];
  if (!note) return undefined;
  return { text: note[lang] ?? note.en, fills: note.fills };
}

export function hasCoverageNote(system: string): boolean {
  return system in NOTES;
}
