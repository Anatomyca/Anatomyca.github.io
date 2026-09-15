import { describe, expect, it } from 'vitest';
import {
  isLatin, isSinhala, isTamil, matchForms, normalise, romanKey,
} from '../../src/search/normalise';

describe('normalise', () => {
  it('strips the Sinhala zero-width joiner so typed and stored forms agree', () => {
    const withZwj = 'ශ්‍රී';
    const without = 'ශ්රී';
    expect(normalise(withZwj)).toBe(normalise(without));
  });

  it('keeps Sinhala vowel signs, which are letters rather than accents', () => {
    // හෘදය and හදය differ only by a vowel sign and are different words.
    expect(normalise('හෘදය')).not.toBe(normalise('හදය'));
  });

  it('keeps Tamil text distinct where it should be', () => {
    expect(normalise('இதயம்')).not.toBe(normalise('இரையகம்'));
  });

  it('folds case and collapses whitespace and punctuation', () => {
    expect(normalise('  Small   Intestine,  ')).toBe('small intestine');
    expect(normalise('Heart')).toBe('heart');
  });

  it('is idempotent', () => {
    const once = normalise('ශ්‍රී  Heart, ');
    expect(normalise(once)).toBe(once);
  });
});

describe('romanKey', () => {
  it('collapses spellings of the same Sinhala word for the heart', () => {
    const k = romanKey('hrudaya');
    expect(romanKey('hridaya')).toBe(k);
    expect(romanKey('hurudaya')).toBe(k);
  });

  it('collapses spellings of the same Tamil word for the heart', () => {
    expect(romanKey('idhayam')).toBe(romanKey('ithayam'));
  });

  it('treats w and v as one sound, as Sinhala romanisation does', () => {
    expect(romanKey('hadawatha')).toBe(romanKey('hadavatha'));
  });

  it('does not collapse genuinely different words', () => {
    expect(romanKey('hrudaya')).not.toBe(romanKey('paapuwa'));
  });

  it('returns empty for input with no letters', () => {
    expect(romanKey('123 -- ')).toBe('');
  });
});

describe('script detection', () => {
  it('identifies each script', () => {
    expect(isSinhala('හෘදය')).toBe(true);
    expect(isTamil('இதயம்')).toBe(true);
    expect(isLatin('heart')).toBe(true);
  });

  it('does not treat Sinhala or Tamil as Latin', () => {
    expect(isLatin('හෘදය')).toBe(false);
    expect(isLatin('இதயம்')).toBe(false);
  });
});

describe('matchForms', () => {
  it('adds a romanised skeleton for Latin input only', () => {
    expect(matchForms('hadawatha')).toHaveLength(2);
    expect(matchForms('හදවත')).toEqual(['හදවත']);
  });

  it('returns nothing for empty input', () => {
    expect(matchForms('   ')).toEqual([]);
  });
});
