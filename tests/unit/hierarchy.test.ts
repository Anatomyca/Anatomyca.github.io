import { describe, expect, it } from 'vitest';
// @ts-expect-error -- pipeline scripts are plain ESM, not part of the app build
import { buildHierarchy } from '../../scripts/build-hierarchy.mjs';

interface Concept {
  id: string; name: string; kind: string;
  elements: string[]; isA: string[]; partOf: string[]; breadcrumb: string[];
}

const DIR = 'tests/fixtures/bodyparts3d';

describe('build-hierarchy', () => {
  it('reads the documented BodyParts3D table formats', async () => {
    const out = await buildHierarchy(DIR) as { concepts: Concept[]; counts: Record<string, number> };
    expect(out.counts['concepts']).toBe(5);
    expect(out.concepts.map((c) => c.name)).toContain('Heart');
  });

  it('resolves a compound to its constituent element files', async () => {
    const out = await buildHierarchy(DIR) as { concepts: Concept[] };
    const heart = out.concepts.find((c) => c.id === 'FMA7088');
    // The syllabus term is the compound; only the elements have meshes.
    expect(heart?.kind).toBe('compound');
    expect(heart?.elements).toEqual(['FJ1235', 'FJ1236', 'FJ1237']);
  });

  it('keeps the two trees separate', async () => {
    const out = await buildHierarchy(DIR) as { concepts: Concept[] };
    const heart = out.concepts.find((c) => c.id === 'FMA7088');
    expect(heart?.isA).toEqual(['FMA85802']);   // what kind of thing it is
    expect(heart?.partOf).toEqual(['FMA7195']); // where it belongs
  });

  it('builds a breadcrumb from the PART-OF tree', async () => {
    const out = await buildHierarchy(DIR) as { concepts: Concept[] };
    expect(out.concepts.find((c) => c.id === 'FMA7088')?.breadcrumb).toEqual(['FMA7195']);
  });

  it('marks a concept with no element list as an element', async () => {
    const out = await buildHierarchy(DIR) as { concepts: Concept[] };
    expect(out.concepts.find((c) => c.id === 'FMA7100')?.kind).toBe('element');
  });
});
