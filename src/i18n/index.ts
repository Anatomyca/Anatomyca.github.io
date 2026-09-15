import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LANGUAGES, isLanguage, type Language } from '../domain/types';

/**
 * Interface strings load per language, on demand, so a Sinhala-medium user
 * never downloads the Tamil bundle. Missing keys fall back to English rather
 * than rendering a raw key at a student.
 */

const STORAGE_KEY = 'anatomyca.lang';

/** Language comes from the URL, then a saved choice, then the device. */
export function detectLanguage(hashLang?: string | null): Language {
  if (isLanguage(hashLang)) return hashLang;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Private mode or blocked storage: fall through to the device setting.
  }
  for (const tag of navigator.languages ?? []) {
    const base = tag.split('-')[0];
    if (isLanguage(base)) return base;
  }
  return 'en';
}

export function rememberLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not fatal — the choice simply will not survive a reload.
  }
}

async function loadBundle(lang: Language): Promise<Record<string, string>> {
  const res = await fetch(`${import.meta.env.BASE_URL}i18n/${lang}.json`);
  if (!res.ok) throw new Error(`Cannot load ${lang} strings: ${res.status}`);
  return (await res.json()) as Record<string, string>;
}

export async function initI18n(lang: Language): Promise<typeof i18n> {
  const [bundle, fallback] = await Promise.all([
    loadBundle(lang),
    lang === 'en' ? Promise.resolve(null) : loadBundle('en'),
  ]);

  await i18n.use(initReactI18next).init({
    lng: lang,
    fallbackLng: 'en',
    supportedLngs: [...LANGUAGES],
    resources: {
      [lang]: { translation: bundle },
      ...(fallback ? { en: { translation: fallback } } : {}),
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  applyDocumentLanguage(lang);
  return i18n;
}

export async function changeLanguage(lang: Language): Promise<void> {
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    i18n.addResourceBundle(lang, 'translation', await loadBundle(lang));
  }
  await i18n.changeLanguage(lang);
  rememberLanguage(lang);
  applyDocumentLanguage(lang);
}

/**
 * Setting `lang` on the root element is what makes the browser pick the
 * right font and line-breaking rules for Sinhala and Tamil, so it is not
 * cosmetic.
 */
function applyDocumentLanguage(lang: Language): void {
  document.documentElement.lang = lang;
}

export { i18n };
