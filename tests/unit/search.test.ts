import { describe, expect, it } from 'vitest';
import { buildSearch } from '../../src/search/index';
import type { Bp3dConcept, Bp3dPart } from '../../src/atlas/manifest';
import partsFixture from '../fixtures/parts.json';
import conceptsFixture from '../fixtures/concepts.json';

// Real entries lifted from the shipped BodyParts3D manifest, so these
// assertions exercise the same names and ids the app indexes.
const PARTS = partsFixture as unknown as Bp3dPart[];
const CONCEPTS = conceptsFixture as unknown as Bp3dConcept[];
const search = buildSearch(PARTS, 'en', CONCEPTS);
const labels = (q: string) => search.search(q).map((r) => r['label'] as string);
const ids = (q: string) => search.search(q).map((r) => r.id as string);

describe('atlas search', () => {
  it('finds the heart, which is a concept with no mesh of its own', () => {
    // The single most obvious query in the atlas: an element-only index
    // would return nothing for it.
    expect(labels('heart')).toContain('heart');
  });

  it('finds an element mesh by name', () => {
    expect(labels('gallbladder')).toContain('Gallbladder');
  });

  it('finds the heart by its Sinhala name', () => {
    expect(labels('හෘදය')).toContain('heart');
  });

  it('finds the heart by its Tamil name', () => {
    expect(labels('இதயம்')).toContain('heart');
  });

  it('finds a structure by its FMA concept id', () => {
    const heart = CONCEPTS.find((c) => c.name === 'heart')!;
    expect(ids(heart.id)).toContain(heart.id);
  });

  it('matches a prefix, so results appear while typing', () => {
    expect(labels('kidn').join(' ')).toMatch(/kidney/i);
  });

  it('tolerates a typo', () => {
    expect(labels('livre')).toContain('liver');
  });

  it('returns nothing for an empty query', () => {
    expect(search.search('   ')).toEqual([]);
  });

  it('prefers the named organ over a mesh inside it', () => {
    expect(labels('spleen')[0]).toBe('spleen');
  });
});
