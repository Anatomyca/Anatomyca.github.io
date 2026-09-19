import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Credits, licences and references.
 *
 * Attribution is a licence condition rather than a courtesy: CC BY 4.0 and
 * CC BY-SA 4.0 both require it to be conveyed to the people the work reaches,
 * and a file in the repository never reaches a student opening the atlas on a
 * phone. This is where the atlas discharges that obligation.
 *
 * The contents are generated from data-sources.json by build-credits.mjs, so
 * the wording cannot drift from the strings the licensors specify — DBCLS in
 * particular fixes its attribution verbatim.
 */

interface Source {
  id: string;
  label: string;
  attribution: string;
  licence: string;
  licenceUrl: string;
  url: string;
  grade: string;
  creators?: string[];
}

interface Reference {
  id: string;
  citation: string;
  doi: string;
  note?: string;
}

interface Credits {
  packLicence: string;
  packLicenceUrl: string;
  sources: Source[];
  studyModels: { id: string; structures: number; names: Record<string, string> }[];
  references: Reference[];
}

export function About() {
  const { t, i18n } = useTranslation();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}credits.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Credits) => setCredits(data))
      .catch(() => setFailed(true));
  }, []);

  return (
    <section className="flex flex-col gap-5 p-5 text-sm">
      <div>
        <h2 className="font-serif text-xl">{t('appName')}</h2>
        <p className="mt-1 text-muted">{t('tagline')}</p>
      </div>

      {/* The disclaimer leads, because it is the thing a reader most needs to
          have seen before they trust anything else on the screen. */}
      <p className="rounded border border-amber-700/50 bg-amber-900/25 px-3 py-2 leading-relaxed text-amber-100">
        {t('disclaimer')}
      </p>

      {failed && <p className="text-muted">{t('noMatch')}</p>}

      {credits && (
        <>
          <div>
            <h3 className="mb-2 font-medium">{t('credits')}</h3>
            <ul className="flex flex-col gap-3">
              {credits.sources.map((source) => (
                <li key={source.id} className="rounded border border-edge bg-panel/50 p-3">
                  <p className="font-medium">{source.label}</p>

                  {/* Reproduced exactly as the licensor requires. */}
                  <p className="mt-1 leading-relaxed text-muted">{source.attribution}</p>

                  {source.creators && source.creators.length > 0 && (
                    <p className="mt-2 leading-relaxed text-muted">
                      <span className="text-bone">{t('createdBy')}: </span>
                      {source.creators.join(' · ')}
                    </p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <a
                      href={source.licenceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline decoration-dotted hover:text-saffron"
                    >
                      {source.licence}
                    </a>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate underline decoration-dotted hover:text-saffron"
                    >
                      {source.url.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-1 font-medium">{t('licence')}</h3>
            <p className="leading-relaxed text-muted">
              {t('packLicenceNote')}{' '}
              <a
                href={credits.packLicenceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-dotted hover:text-saffron"
              >
                {credits.packLicence}
              </a>
              . {t('codeLicenceNote')}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-medium">{t('references')}</h3>
            <ul className="flex flex-col gap-2">
              {credits.references.map((reference) => (
                <li key={reference.id} className="leading-relaxed text-muted">
                  {reference.citation}{' '}
                  <a
                    href={reference.doi}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline decoration-dotted hover:text-saffron"
                  >
                    {reference.doi.replace(/^https?:\/\//, '')}
                  </a>
                  {reference.note && (
                    <span className="block text-xs italic">{reference.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <p className="text-xs text-muted" lang={i18n.language}>{t('reportError')}</p>
    </section>
  );
}
