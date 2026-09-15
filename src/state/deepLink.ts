import { isLanguage, type Language } from '../domain/types';

/**
 * Application state lives in the URL hash.
 *
 * GitHub Pages has no server-side rewriting, so a path like /structure/heart
 * would 404 on a cold load. A hash never reaches the server, which makes
 * every view shareable — the point being that a student can paste a link
 * into a class group and it opens on the right structure, in the right
 * language, with the right systems showing.
 *
 *   #/s/heart?lang=si&sys=cardio,resp&sex=m
 */
export interface AtlasRoute {
  readonly structure: string | null;
  readonly lang: Language | null;
  readonly systems: readonly string[] | null;
  readonly sex: 'male' | 'female' | null;
}

export const EMPTY_ROUTE: AtlasRoute = {
  structure: null, lang: null, systems: null, sex: null,
};

export function parseHash(hash: string): AtlasRoute {
  const raw = hash.replace(/^#/, '');
  if (!raw) return EMPTY_ROUTE;

  const [path = '', queryString = ''] = raw.split('?', 2);
  const query = new URLSearchParams(queryString);

  const segments = path.split('/').filter(Boolean);
  // Accept both the canonical '/s/<id>' and a bare '#heart', which is what
  // links shared from the previous version of the atlas look like.
  let structure: string | null = null;
  if (segments[0] === 's' && segments[1]) structure = decodeURIComponent(segments[1]);
  else if (segments.length === 1 && segments[0]) structure = decodeURIComponent(segments[0]);

  const langParam = query.get('lang');
  const sysParam = query.get('sys');
  const sexParam = query.get('sex');

  return {
    structure,
    lang: isLanguage(langParam) ? langParam : null,
    systems: sysParam ? sysParam.split(',').filter(Boolean) : null,
    sex: sexParam === 'f' || sexParam === 'female' ? 'female'
      : sexParam === 'm' || sexParam === 'male' ? 'male' : null,
  };
}

export function buildHash(route: Partial<AtlasRoute>): string {
  const query = new URLSearchParams();
  if (route.lang) query.set('lang', route.lang);
  if (route.systems?.length) query.set('sys', route.systems.join(','));
  if (route.sex) query.set('sex', route.sex === 'female' ? 'f' : 'm');

  const path = route.structure ? `/s/${encodeURIComponent(route.structure)}` : '/';
  const qs = query.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

/** Absolute URL for sharing and for the QR code. */
export function shareUrl(route: Partial<AtlasRoute>): string {
  return `${location.origin}${location.pathname}${buildHash(route)}`;
}
