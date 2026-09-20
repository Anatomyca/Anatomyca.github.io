import { describe, expect, it } from 'vitest';
import credits from '../../public/credits.json';
import sources from '../../data-sources.json';

/**
 * Attribution is a licence condition, not a courtesy, so these are
 * compliance tests: if they fail, the atlas is being distributed without
 * satisfying the terms it is distributed under.
 */

interface Credits {
  packLicence: string;
  sources: {
    id: string; label: string; attribution: string;
    licence: string; licenceUrl: string; url: string; creators?: string[];
  }[];
  references: { id: string; citation: string; doi: string }[];
}

const CREDITS = credits as unknown as Credits;

describe('credits', () => {
  it('reproduces the DBCLS attribution verbatim, as the licensor specifies', () => {
    const bp3d = CREDITS.sources.find((s) => s.id === 'bodyparts3d');
    expect(bp3d?.attribution).toBe(
      'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International',
    );
  });

  it('credits every source that is actually shipped', () => {
    const shipped = Object.entries(sources.sources)
      .filter(([, s]) => (s as { shipped?: boolean }).shipped)
      .map(([id]) => id);
    expect(CREDITS.sources.map((s) => s.id).sort()).toEqual(shipped.sort());
  });

  it('gives every credited source a licence, a licence link and a source link', () => {
    for (const source of CREDITS.sources) {
      expect(source.attribution.trim()).not.toBe('');
      expect(source.licence.trim()).not.toBe('');
      expect(source.licenceUrl).toMatch(/^https:\/\//);
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it('names who made the reviewed geometry', () => {
    const o3d = CREDITS.sources.find((s) => s.id === 'open3dmodel');
    expect(o3d?.creators?.length).toBeGreaterThan(0);
    expect(o3d?.creators?.join(' ')).toContain('Leiden');
  });

  it('reports the pack as ShareAlike while a ShareAlike source is shipped', () => {
    // ShareAlike is contagious: one SA source makes the whole pack SA, and
    // saying otherwise would mislead anyone reusing it.
    const hasShareAlike = CREDITS.sources.some((s) => s.licence.includes('-SA-'));
    expect(CREDITS.packLicence).toBe(hasShareAlike ? 'CC-BY-SA-4.0' : 'CC-BY-4.0');
  });

  it('cites the papers behind the data', () => {
    expect(CREDITS.references.length).toBeGreaterThanOrEqual(3);
    for (const reference of CREDITS.references) {
      expect(reference.citation.trim()).not.toBe('');
      expect(reference.doi).toMatch(/^https:\/\//);
    }
    expect(CREDITS.references.map((r) => r.citation).join(' ')).toContain('Mitsuhashi');
  });
});

/**
 * Every study model must carry its own attribution. The pack notice is not
 * enough on its own: a student looking at one reviewed model should be able
 * to see who made it and who checked it, and a Grade A badge is a claim
 * about human review that needs a name behind it.
 */
interface StudyModel {
  id: string;
  structures: number;
  grade: string | null;
  credit: {
    source: string; attribution: string; licence: string;
    licenceUrl: string; url: string; reviewedBy?: string;
  } | null;
}

const MODELS = (credits as unknown as { studyModels: StudyModel[] }).studyModels;

describe('study model credits', () => {
  it('attributes every shipped study model', () => {
    expect(MODELS.length).toBeGreaterThan(0);
    for (const model of MODELS) {
      expect(model.credit, `${model.id} ships with no credit`).not.toBeNull();
      expect(model.credit?.attribution.trim()).not.toBe('');
      expect(model.credit?.licenceUrl).toMatch(/^https?:\/\//);
      expect(model.credit?.url).toMatch(/^https?:\/\//);
    }
  });

  it('names a source that data-sources.json actually defines', () => {
    const known = new Set(Object.keys(sources.sources));
    for (const model of MODELS) {
      expect(known).toContain(model.credit?.source);
    }
  });

  it('carries the licence its source carries, not a weaker one', () => {
    const defined = sources.sources as Record<string, { licence: string }>;
    for (const model of MODELS) {
      const source = model.credit?.source;
      if (!source) continue;
      expect(model.credit?.licence).toBe(defined[source]?.licence);
    }
  });

  it('never claims Grade A without naming who reviewed it', () => {
    for (const model of MODELS.filter((m) => m.grade === 'A')) {
      expect(
        model.credit?.reviewedBy?.trim(),
        `${model.id} is badged Grade A but names no reviewer`,
      ).toBeTruthy();
    }
  });

  it('ships no model under a licence outside the approved set', () => {
    const approved = new Set(sources.approvedLicences);
    for (const model of MODELS) {
      expect(approved).toContain(model.credit?.licence);
    }
  });
});
