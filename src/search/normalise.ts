/**
 * Script-aware normalisation for search.
 *
 * Three problems have to be solved before a query can match a name:
 *
 *  1. The Sinhala zero-width joiner. Forms like ශ්‍රී and ක්‍ය carry U+200D
 *     between consonants. It is essential for correct *display* and must be
 *     preserved there, but users type it inconsistently — most phone
 *     keyboards omit it — so it is stripped for *matching*.
 *  2. Romanised input. Many students type Sinhala and Tamil phonetically on
 *     an English keyboard ("hadawatha", "idhayam"). Those spellings vary, so
 *     romanised forms are reduced to a loose skeleton before comparison.
 *  3. Unicode form. Text is stored NFC; queries may arrive NFD from some
 *     input methods.
 */

/** Zero-width joiner and non-joiner: display-significant, match-irrelevant. */
const ZERO_WIDTH = /[‌‍]/g;

/** Combining marks, for the romanisation path only. */
const COMBINING = /[̀-ͯ]/g;

/**
 * Normalise any string for matching: NFC, case-folded, zero-width joiners
 * and surrounding punctuation removed, whitespace collapsed.
 *
 * Sinhala and Tamil vowel signs are NOT stripped — they are letters, not
 * accents, and removing them would collide distinct words.
 */
export function normalise(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(ZERO_WIDTH, '')
    .replace(/[‘’“”'"(),.;:!?—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reduce a romanised spelling to a consonant skeleton, so that the many ways
 * of writing one sound collapse together.
 *
 * "hrudaya", "hridaya" and "hurudaya" all reduce to the same key, as do
 * "idhayam" and "ithayam". Vowels are dropped entirely rather than merely
 * collapsed, because romanised Sinhala and Tamil insert and omit them
 * freely — හෘදය is written with or without a vowel after the h. A leading
 * vowel is kept as a single marker, since dropping it would merge words
 * that begin with one and words that do not.
 *
 * This is deliberately lossy, and it does collide unrelated English words
 * ("heart" and "hard" share a skeleton). That is why the key is indexed as
 * its own low-weighted search field rather than mixed into the name text:
 * it can only widen recall behind an exact match, never outrank one.
 */
export function romanKey(input: string): string {
  let s = input.normalize('NFD').replace(COMBINING, '').toLowerCase();
  s = s.replace(/[^a-z]/g, '');
  if (!s) return '';
  // Aspirates and digraphs: the 'h' is optional in practice.
  s = s.replace(/(kh|gh|ch|jh|th|dh|ph|bh)/g, (m) => m[0]!);
  s = s.replace(/sh|ss/g, 's');
  s = s.replace(/w/g, 'v');
  s = s.replace(/z/g, 's');
  s = s.replace(/x/g, 'ks');
  // Retroflex/dental and liquid pairs a Latin keyboard cannot distinguish.
  s = s.replace(/t/g, 'd');
  s = s.replace(/[lr]/g, 'l');
  const leadingVowel = /^[aeiou]/.test(s) ? 'a' : '';
  s = leadingVowel + s.replace(/[aeiou]/g, '');
  // Doubled consonants carry no distinction once romanised.
  s = s.replace(/([a-z])\1+/g, '$1');
  return s;
}

/** True when the script of the text is Sinhala. */
export function isSinhala(text: string): boolean {
  return /[඀-෿]/.test(text);
}

/** True when the script of the text is Tamil. */
export function isTamil(text: string): boolean {
  return /[஀-௿]/.test(text);
}

/** True when the text is plain Latin script, so romanised matching applies. */
export function isLatin(text: string): boolean {
  return /[a-z]/i.test(text) && !isSinhala(text) && !isTamil(text);
}

/**
 * Every matchable form of a term: the normalised original, plus a romanised
 * skeleton when the term is written in Latin script.
 */
export function matchForms(term: string): string[] {
  const base = normalise(term);
  if (!base) return [];
  const forms = [base];
  if (isLatin(base)) {
    const key = romanKey(base);
    if (key && key !== base) forms.push(key);
  }
  return forms;
}
