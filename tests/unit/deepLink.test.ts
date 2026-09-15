import { describe, expect, it } from 'vitest';
import { buildHash, EMPTY_ROUTE, parseHash } from '../../src/state/deepLink';

describe('deep links', () => {
  it('parses a full route', () => {
    expect(parseHash('#/s/heart?lang=si&sys=cardio,resp&sex=f')).toEqual({
      structure: 'heart', lang: 'si', systems: ['cardio', 'resp'], sex: 'female',
    });
  });

  it('treats an empty hash as no route', () => {
    expect(parseHash('')).toEqual(EMPTY_ROUTE);
    expect(parseHash('#')).toEqual(EMPTY_ROUTE);
  });

  it('accepts a bare #id, as shared from the previous version', () => {
    expect(parseHash('#liver').structure).toBe('liver');
  });

  it('ignores a language that is not supported', () => {
    expect(parseHash('#/s/heart?lang=fr').lang).toBeNull();
  });

  it('round-trips through build and parse', () => {
    const route = { structure: 'heart', lang: 'ta' as const, systems: ['cardio'], sex: 'male' as const };
    expect(parseHash(buildHash(route))).toEqual(route);
  });

  it('omits empty parameters', () => {
    expect(buildHash({ structure: 'heart' })).toBe('#/s/heart');
    expect(buildHash({})).toBe('#/');
  });

  it('encodes an id that needs escaping', () => {
    expect(parseHash(buildHash({ structure: 'a/b' })).structure).toBe('a/b');
  });
});
