#!/usr/bin/env node
/**
 * Emit the credits the app displays.
 *
 * Attribution is a licence condition, not a courtesy. CC BY 4.0 and
 * CC BY-SA 4.0 both require it to be conveyed to the people the work is
 * distributed to — and a file in the repository is not conveyed to a student
 * opening the atlas on a phone. This generates what the interface shows.
 *
 * It is generated rather than written so the wording cannot drift from
 * data-sources.json, where the licensors' required strings are pinned and
 * checked. DBCLS in particular specifies its attribution verbatim.
 *
 *   node scripts/build-credits.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SOURCES = 'data-sources.json';
const STUDY = 'public/atlas/study-models.json';
const OUT = 'public/credits.json';

/**
 * Publications to cite. These are the papers behind the data, which is a
 * separate obligation from the data licence — BodyParts3D's paper is
 * CC BY-NC 2.0 UK while its data is CC BY 4.0.
 */
const REFERENCES = [
  {
    id: 'bodyparts3d',
    citation: 'Mitsuhashi N., Fujieda K., Tamura T., Kawamoto S., Takagi T., Okubo K. (2009). '
      + 'BodyParts3D: 3D structure database for anatomical concepts. '
      + 'Nucleic Acids Research 37(suppl_1): D782–D785.',
    doi: 'https://doi.org/10.1093/nar/gkn613',
    note: 'The paper is CC BY-NC 2.0 UK — a different licence from the data. Cite it; do not reuse its figures.',
  },
  {
    id: 'taro',
    citation: 'Nagaoka T. et al. (2004). Development of realistic high-resolution whole-body '
      + 'voxel models of Japanese adult male and female of average height and weight. '
      + 'Physics in Medicine and Biology 49: 1–15.',
    doi: 'https://doi.org/10.1088/0031-9155/49/1/001',
    note: 'The MRI volume the BodyParts3D body was segmented from.',
  },
  {
    id: 'fma',
    citation: 'Rosse C., Mejino J.L.V. (2003). A reference ontology for biomedical informatics: '
      + 'the Foundational Model of Anatomy. Journal of Biomedical Informatics 36: 478–500.',
    doi: 'https://doi.org/10.1016/j.jbi.2003.11.007',
    note: 'The FMA concept ids used as this atlas’s primary key.',
  },
  {
    id: 'z-anatomy',
    citation: 'Kervyn G. (2022). The First Open Source 3D Atlas of Human Anatomy. '
      + 'Acta Scientific Anatomy 1(4): 13–15.',
    doi: 'https://actascientific.com/ASAT/pdf/ASAT-01-0022.pdf',
    note: 'Z-Anatomy, the retopologised model Open3Dmodel was built from.',
  },
];

async function main() {
  const config = JSON.parse(await readFile(SOURCES, 'utf8'));

  const sources = Object.entries(config.sources)
    .filter(([, source]) => source.shipped)
    .map(([id, source]) => ({
      id,
      label: source.label,
      attribution: source.attribution,
      licence: source.licence,
      licenceUrl: source.licenceUrl,
      url: source.url,
      grade: source.grade,
      ...(source.creators ? { creators: source.creators } : {}),
    }));

  const study = existsSync(STUDY)
    ? JSON.parse(await readFile(STUDY, 'utf8'))
    : { models: [] };

  const credits = {
    generatedAt: new Date().toISOString(),
    // What the pack as a whole is licensed under, once every shipped source
    // is taken together. ShareAlike is contagious, so this is the answer.
    packLicence: sources.some((s) => s.licence.includes('-SA-'))
      ? 'CC-BY-SA-4.0'
      : 'CC-BY-4.0',
    packLicenceUrl: sources.some((s) => s.licence.includes('-SA-'))
      ? 'https://creativecommons.org/licenses/by-sa/4.0/'
      : 'https://creativecommons.org/licenses/by/4.0/',
    sources,
    studyModels: study.models.map((m) => ({
      id: m.id,
      names: m.names,
      structures: m.structures.length,
      grade: m.grade ?? null,
      // Each model carries its own attribution, so a student looking at one
      // can see who made and checked it without reading the whole pack notice.
      credit: m.credit ?? null,
    })),
    references: REFERENCES,
  };

  await writeFile(OUT, JSON.stringify(credits) + '\n');
  process.stdout.write(
    `Credits: ${sources.length} shipped sources, ${credits.studyModels.length} study models, ` +
    `${REFERENCES.length} references. Pack licence: ${credits.packLicence}\n-> ${OUT}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`build-credits failed: ${err.message}\n`);
  process.exitCode = 1;
});
