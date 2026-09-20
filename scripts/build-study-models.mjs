#!/usr/bin/env node
/**
 * Index the reviewed study models, and take in new ones from glb-files/.
 *
 * These are anatomist-reviewed GLB models — Grade A — and unlike the
 * BodyParts3D body they arrive as named meshes rather than a manifest. The
 * names are the whole point: "Atlas (C1)", "Lower first molar tooth.r" is
 * what makes them a study tool rather than a picture of a skeleton.
 *
 * This reads each GLB's JSON chunk, which carries node names and per-mesh
 * bounds even though the geometry itself is Draco-compressed, and writes the
 * index the app loads before deciding what to fetch.
 *
 * Two intakes feed it:
 *
 *   public/atlas/models/  the models already shipped, listed in CATALOGUE
 *   glb-files/            the drop-in folder, described by its sources.json
 *
 * Both are indexed identically and both must name a source in
 * data-sources.json. A file that names none is refused rather than skipped:
 * a mesh nobody can trace to a licensor cannot be shipped in a CC BY-SA pack,
 * and a mesh nobody has checked is worse than an absent one because a student
 * cannot tell the difference.
 *
 *   node scripts/build-study-models.mjs
 */
import { readFile, writeFile, readdir, stat, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const MODELS_DIR = 'public/atlas/models';
const INTAKE_DIR = 'glb-files';
const INTAKE_MANIFEST = join(INTAKE_DIR, 'sources.json');
const SOURCES = 'data-sources.json';
const OUT = 'public/atlas/study-models.json';

/** Editorial order and labels; the drop-in folder is appended after these. */
const CATALOGUE = [
  {
    file: 'overview-skeleton.glb',
    id: 'skeleton',
    source: 'open3dmodel',
    grade: 'A',
    names: {
      en: 'Skeleton', si: 'අස්ථි පද්ධතිය', ta: 'எலும்புத் தொகுதி',
    },
    summary: {
      en: 'Every named bone of the body, reviewed by anatomists.',
      si: 'ශරීරයේ නම් කළ සෑම අස්ථියක්ම, ව්‍යුහ විද්‍යාඥයන් විසින් සමාලෝචනය කරන ලදී.',
      ta: 'உடலின் பெயரிடப்பட்ட ஒவ்வொரு எலும்பும், உடற்கூற்றியலாளரால் மதிப்பாய்வு செய்யப்பட்டது.',
    },
  },
  {
    file: 'overview-colored-skull.glb',
    id: 'skull',
    source: 'open3dmodel',
    grade: 'A',
    names: { en: 'Skull', si: 'හිස්කබල', ta: 'மண்டையோடு' },
    summary: {
      en: 'The skull with each bone and tooth separately named and coloured.',
      si: 'සෑම අස්ථියක්ම හා දතක්ම වෙන් වෙන්ව නම් කර වර්ණ ගන්වා ඇති හිස්කබල.',
      ta: 'ஒவ்வொரு எலும்பும் பல்லும் தனித்தனியே பெயரிடப்பட்ட மண்டையோடு.',
    },
  },
  {
    file: 'exploded-skull.glb',
    id: 'skull-exploded',
    source: 'open3dmodel',
    grade: 'A',
    names: { en: 'Skull, exploded', si: 'හිස්කබල, වෙන් කළ', ta: 'மண்டையோடு, பிரித்த' },
    summary: {
      en: 'The same bones drawn apart, so the sutures between them can be followed.',
      si: 'එකිනෙකින් වෙන් කර ඇඳි එම අස්ථි, ඒවා අතර මැහුම් අනුගමනය කළ හැකි වන පරිදි.',
      ta: 'அதே எலும்புகள் விலக்கி வரையப்பட்டுள்ளன, அவற்றுக்கிடையேயான இணைப்புகளைப் பின்தொடர.',
    },
  },
  {
    file: 'colored-skull-base.glb',
    id: 'skull-base',
    source: 'open3dmodel',
    grade: 'A',
    names: { en: 'Skull base', si: 'හිස්කබලේ පාදම', ta: 'மண்டையோட்டின் அடித்தளம்' },
    summary: {
      en: 'The floor of the cranial cavity, where the cranial nerves leave the skull.',
      si: 'කපාල කුහරයේ බිම, කපාල ස්නායු හිස්කබලෙන් පිටවන ස්ථානය.',
      ta: 'மண்டையோட்டு குழியின் தளம், மூளை நரம்புகள் வெளியேறும் இடம்.',
    },
  },
  {
    file: 'vertebrae.glb',
    id: 'vertebrae',
    source: 'open3dmodel',
    grade: 'A',
    names: { en: 'Vertebrae compared', si: 'කශේරුකා සැසඳීම', ta: 'முள்ளெலும்புகள் ஒப்பீடு' },
    summary: {
      en: 'A cervical, a thoracic and a lumbar vertebra side by side.',
      si: 'ගැබ්බර, උරස් හා කටි කශේරුකා තුනක් අසල අසල.',
      ta: 'கழுத்து, மார்பு, இடுப்பு முள்ளெலும்புகள் அருகருகே.',
    },
  },
];

const LANGS = ['en', 'si', 'ta'];

function glbJson(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4E4F534A) throw new Error('first chunk is not JSON');
  return JSON.parse(new TextDecoder().decode(buffer.subarray(20, 20 + length)));
}

/** Meshes carry a `.l` / `.r` suffix for paired bones; keep it readable. */
function tidy(name) {
  return name
    .replace(/\.l$/i, ' (left)')
    .replace(/\.r$/i, ' (right)')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read the drop-in folder. Every .glb there must be described in its
 * sources.json; the mismatches are collected and reported together, because
 * someone adding four models wants all four problems at once.
 */
async function readIntake(sources, approved, forbidden) {
  if (!existsSync(INTAKE_DIR)) return { entries: [], problems: [] };

  const files = (await readdir(INTAKE_DIR)).filter((f) => f.toLowerCase().endsWith('.glb'));
  const manifest = existsSync(INTAKE_MANIFEST)
    ? JSON.parse(await readFile(INTAKE_MANIFEST, 'utf8'))
    : { models: {} };
  const described = manifest.models ?? {};
  const problems = [];
  const entries = [];

  for (const file of Object.keys(described)) {
    if (!files.includes(file)) {
      problems.push(`${INTAKE_MANIFEST} describes ${file}, but no such file is in ${INTAKE_DIR}/`);
    }
  }

  for (const file of files) {
    const entry = described[file];
    if (!entry) {
      problems.push(
        `${file} has no entry in ${INTAKE_MANIFEST}. Every model must name its source — ` +
        'see glb-files/glb-readme.md.',
      );
      continue;
    }
    const source = sources[entry.source];
    if (!entry.source || !source) {
      problems.push(`${file}: source "${entry.source ?? ''}" is not defined in ${SOURCES}`);
      continue;
    }
    if (forbidden.has(source.licence)) {
      problems.push(`${file}: ${entry.source} is ${source.licence} — ${forbidden.get(source.licence)}`);
      continue;
    }
    if (!approved.has(source.licence)) {
      problems.push(`${file}: ${entry.source} is ${source.licence}, which is not in approvedLicences`);
      continue;
    }
    if (!entry.id) {
      problems.push(`${file}: no id`);
      continue;
    }
    const missing = LANGS.filter((l) => !entry.names?.[l]?.trim());
    if (missing.length > 0) {
      problems.push(`${file}: no name in ${missing.join(', ')} — all three languages are required`);
      continue;
    }
    // Grade A is a claim that a person checked the anatomy. It needs a name.
    if (entry.grade === 'A' && !entry.reviewedBy?.trim()) {
      problems.push(`${file}: grade A needs a named reviewedBy, or the grade must be B`);
      continue;
    }
    entries.push({ ...entry, file, dir: INTAKE_DIR });
  }

  return { entries, problems };
}

/** Read a GLB and describe every named, mesh-bearing node in it. */
async function indexModel(path) {
  const gltf = glbJson(await readFile(path));
  const bytes = (await stat(path)).size;

  const structures = [];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];

  for (const node of gltf.nodes ?? []) {
    if (node.mesh === undefined) continue;
    const mesh = gltf.meshes?.[node.mesh];
    const raw = node.name || mesh?.name;
    if (!raw) continue;

    const box = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
    let triangles = 0;
    for (const prim of mesh?.primitives ?? []) {
      const accessor = gltf.accessors?.[prim.attributes?.POSITION];
      if (accessor?.min && accessor?.max) {
        for (let i = 0; i < 3; i++) {
          box[0][i] = Math.min(box[0][i], accessor.min[i]);
          box[1][i] = Math.max(box[1][i], accessor.max[i]);
          lo[i] = Math.min(lo[i], accessor.min[i]);
          hi[i] = Math.max(hi[i], accessor.max[i]);
        }
      }
      const indices = gltf.accessors?.[prim.indices];
      if (indices?.count) triangles += indices.count / 3;
    }

    structures.push({
      // The mesh name is the id: it is what the runtime looks up in the
      // loaded scene, so it must be the raw name, not the tidied one.
      id: raw,
      name: tidy(raw),
      triangles: Math.round(triangles),
      bounds: box[0][0] === Infinity ? null : box.map((c) => c.map((n) => Math.round(n * 1e4) / 1e4)),
    });
  }

  structures.sort((a, b) => a.name.localeCompare(b.name));
  return {
    bytes,
    structures,
    bounds: lo[0] === Infinity ? null : [lo, hi].map((c) => c.map((n) => Math.round(n * 1e4) / 1e4)),
  };
}

async function main() {
  const config = JSON.parse(await readFile(SOURCES, 'utf8'));
  const sources = config.sources ?? {};
  const approved = new Set(config.approvedLicences);
  const forbidden = new Map((config.forbiddenLicences ?? []).map((f) => [f.id, f.reason]));

  const present = new Set(await readdir(MODELS_DIR));
  const shipped = CATALOGUE.map((entry) => ({ ...entry, dir: MODELS_DIR }));
  const intake = await readIntake(sources, approved, forbidden);

  if (intake.problems.length > 0) {
    process.stderr.write(
      'Model intake refused:\n' + intake.problems.map((p) => `  - ${p}`).join('\n') + '\n',
    );
    process.exitCode = 1;
    return;
  }

  const models = [];
  const added = [];

  for (const entry of [...shipped, ...intake.entries]) {
    if (entry.dir === MODELS_DIR && !present.has(entry.file)) {
      process.stderr.write(`  missing ${entry.file}, skipping\n`);
      continue;
    }

    // Accepted drop-ins are copied to where the app serves models from, so
    // the runtime has one directory to reason about.
    if (entry.dir === INTAKE_DIR) {
      await copyFile(join(INTAKE_DIR, entry.file), join(MODELS_DIR, entry.file));
      added.push(entry.file);
    }

    const indexed = await indexModel(join(MODELS_DIR, entry.file));
    if (indexed.structures.length === 0) {
      process.stderr.write(
        `Model intake refused:\n  - ${entry.file}: no named meshes. Unnamed meshes ` +
        'make a picture, not a study tool.\n',
      );
      process.exitCode = 1;
      return;
    }

    const source = sources[entry.source];
    // Grade A asserts that a person checked the anatomy, so it must resolve
    // to a name. A drop-in model states its reviewer explicitly. The models
    // shipped from a project whose review process is published fall back to
    // the institutions that ran it — the distributed files name no individual
    // (see data-sources.json creditNote), so the institution is the honest
    // answer rather than a person invented to fill the field.
    const grade = entry.grade ?? source?.grade ?? 'B';
    const reviewedBy = entry.reviewedBy?.trim()
      || (grade === 'A' && source?.grade === 'A' ? source.creators?.join(' · ') : undefined);

    models.push({
      id: entry.id,
      file: entry.file,
      names: entry.names,
      summary: entry.summary,
      grade,
      // Attribution travels with the model, not just with the pack, so the
      // interface can credit each one where a student is looking at it.
      credit: source
        ? {
            source: entry.source,
            label: source.label,
            attribution: source.attribution,
            licence: source.licence,
            licenceUrl: source.licenceUrl,
            url: entry.sourceUrl ?? source.url,
            ...(source.creators ? { creators: source.creators } : {}),
            ...(reviewedBy ? { reviewedBy } : {}),
          }
        : null,
      ...indexed,
    });
  }

  await writeFile(OUT, JSON.stringify({
    source: 'open3dmodel',
    grade: 'A',
    generatedAt: new Date().toISOString(),
    models,
  }) + '\n');

  process.stdout.write('Study models indexed:\n');
  for (const m of models) {
    process.stdout.write(
      `  ${m.id.padEnd(16)} ${String(m.structures.length).padStart(4)} structures  ` +
      `${(m.bytes / 1048576).toFixed(2)} MB  grade ${m.grade}\n`,
    );
  }
  if (added.length > 0) {
    process.stdout.write(`Taken in from ${INTAKE_DIR}/: ${added.join(', ')}\n`);
  }
  process.stdout.write(`-> ${OUT}\n`);
}

main().catch((err) => {
  process.stderr.write(`build-study-models failed: ${err.message}\n`);
  process.exitCode = 1;
});
