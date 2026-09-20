import { describe, expect, it } from 'vitest';
import { buildStudySearch } from '../../src/search/index';
import { modelName, modelSummary, type StudyCatalogue } from '../../src/atlas/studyModels';
import fixture from '../fixtures/study-models.json';
import catalogue from '../../public/atlas/study-models.json';

const CATALOGUE = fixture as unknown as StudyCatalogue;
const FULL = catalogue as unknown as StudyCatalogue;

describe('study model catalogue', () => {
  it('is Grade A, which is the whole reason for shipping it', () => {
    expect(FULL.grade).toBe('A');
    expect(FULL.source).toBe('open3dmodel');
  });

  it('leads with the five anatomist-reviewed models', () => {
    // The reviewed models come first because the grade is the reason to
    // choose between them, and a student should meet the checked ones first.
    expect(FULL.models.slice(0, 5).map((m) => m.id)).toEqual([
      'skeleton', 'skull', 'skull-exploded', 'skull-base', 'vertebrae',
    ]);
    expect(FULL.models.slice(0, 5).every((m) => m.grade === 'A')).toBe(true);
  });

  it('grades every model, and grades the unreviewed ones honestly', () => {
    for (const model of FULL.models) {
      expect(['A', 'B', 'C'], `${model.id} has grade ${model.grade}`)
        .toContain(model.grade);
    }
    // Nothing may claim review it has not had.
    for (const model of FULL.models.filter((m) => m.grade === 'A')) {
      expect(model.credit?.reviewedBy?.trim(), `${model.id}`).toBeTruthy();
    }
  });

  it('names every structure it ships', () => {
    for (const model of FULL.models) {
      expect(model.structures.length).toBeGreaterThan(0);
      for (const structure of model.structures) {
        expect(structure.name.trim()).not.toBe('');
        expect(structure.id.trim()).not.toBe('');
      }
    }
  });

  it('keeps the mesh id raw, since the runtime looks it up in the scene', () => {
    // Paired bones are exported as "Parietal bone.l"; the display name is
    // tidied but the id must still match the mesh.
    const skull = FULL.models.find((m) => m.id === 'skull')!;
    const paired = skull.structures.find((s) => s.name.includes('(left)'));
    expect(paired?.id).toMatch(/\.l$/);
  });

  it('translates model names into all three languages', () => {
    for (const model of FULL.models) {
      for (const lang of ['en', 'si', 'ta'] as const) {
        expect(modelName(model, lang).trim()).not.toBe('');
        expect(modelSummary(model, lang).trim()).not.toBe('');
      }
    }
  });

  it('places the skeleton in the same metres-and-Y-up space as the body', () => {
    // Both must stand on the floor at roughly human height, or switching
    // between them would jump the camera.
    const skeleton = FULL.models.find((m) => m.id === 'skeleton')!;
    const [lo, hi] = skeleton.bounds!;
    expect(lo[1]!).toBeGreaterThanOrEqual(-0.05);
    expect(hi[1]!).toBeGreaterThan(1.5);
    expect(hi[1]!).toBeLessThan(2);
  });
});

describe('study model search', () => {
  const skeleton = CATALOGUE.models.find((m) => m.id === 'skeleton')!;
  const search = buildStudySearch(skeleton.structures);
  const labels = (q: string) => search.search(q).map((r) => r['label'] as string);

  it('finds a bone by name', () => {
    const first = skeleton.structures[0]!;
    expect(labels(first.name.split(' ')[0]!)).toContain(first.name);
  });

  it('returns nothing for an empty query', () => {
    expect(search.search('  ')).toEqual([]);
  });

  it('returns nothing for a structure that is not in this model', () => {
    expect(labels('pancreas')).toEqual([]);
  });

  it('prefers an exact name over a partial one', () => {
    const search2 = buildStudySearch([
      { id: 'a', name: 'Rib' },
      { id: 'b', name: 'Rib cartilage' },
    ]);
    expect(search2.search('Rib')[0]?.['label']).toBe('Rib');
  });
});
