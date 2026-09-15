import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '../domain/types';
import { changeLanguage } from '../i18n/index';
import { useAtlas } from '../state/store';

const LABEL: Record<Language, string> = { en: 'EN', si: 'සි', ta: 'த' };

/** Three-way switch, always visible: no one should have to hunt for it. */
export function LanguageSwitch() {
  const { t } = useTranslation();
  const lang = useAtlas((s) => s.lang);
  const setLang = useAtlas((s) => s.setLang);

  return (
    <div className="flex shrink-0 gap-1" role="group" aria-label={t('language')}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          onClick={() => { setLang(code); void changeLanguage(code); }}
          aria-pressed={lang === code}
          lang={code}
          className={`compact rounded px-2 py-1 text-sm ${
            lang === code ? 'bg-carmine text-white' : 'border border-edge text-muted'
          }`}
        >
          {LABEL[code]}
        </button>
      ))}
    </div>
  );
}
