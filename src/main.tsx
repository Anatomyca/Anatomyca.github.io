import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { detectLanguage, initI18n } from './i18n/index';
import { parseHash } from './state/deepLink';
import { useAtlas } from './state/store';
import './ui/styles.css';

async function start(): Promise<void> {
  const route = parseHash(location.hash);
  const lang = detectLanguage(route.lang);
  await initI18n(lang);

  // Read the whole route into the store BEFORE setting the language.
  // setLang mirrors state back into the URL, so doing it first would write a
  // hash built from an empty selection and wipe the structure out of a link
  // someone had just pasted.
  const atlas = useAtlas.getState();
  atlas.syncFromHash(location.hash);
  atlas.setLang(lang);

  const host = document.getElementById('root');
  if (!host) throw new Error('Missing #root');
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
