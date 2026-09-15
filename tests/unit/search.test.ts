import { describe, expect, it } from 'vitest';
import { buildSearch } from '../../src/search/index';
import { SEED_STRUCTURES } from '../../src/data/structures';

const search = buildSearch(SEED_STRUCTURES, 'en');
const ids = (q: string) => search.search(q).map((r) => r.id as string);

describe('atlas search', () => {
  it('finds a structure by its English name', () => {
    expect(ids('heart')).toContain('heart');
  });

  it('finds the heart by its Sinhala name', () => {
    expect(ids('හෘදය')).toContain('heart');
  });

  it('finds the heart by its Tamil name', () => {
    expect(ids('இதயம்')).toContain('heart');
  });

  it('finds a structure by its Latin term', () => {
    expect(ids('Cor')).toContain('heart');
  });

  it('matches a prefix, so results appear while typing', () => {
    expect(ids('kidn')).toContain('kidneys');
  });

  it('tolerates a typo', () => {
    expect(ids('livre')).toContain('liver');
  });

  it('returns nothing for an empty query', () => {
    expect(search.search('   ')).toEqual([]);
  });

  it('ranks the exact name first', () => {
    expect(ids('lungs')[0]).toBe('lungs');
  });
});
