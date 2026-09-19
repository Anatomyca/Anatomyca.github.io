#!/usr/bin/env node
/**
 * Index the Open3Dmodel study models.
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
 *   node scripts/build-study-models.mjs
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MODELS_DIR = 'public/atlas/models';
const OUT = 'public/atlas/study-models.json';

/** Editorial order and labels; anything else found is appended. */
const CATALOGUE = [
  {
    file: 'overview-skeleton.glb',
    id: 'skeleton',
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
    names: { en: 'Vertebrae compared', si: 'කශේරුකා සැසඳීම', ta: 'முள்ளெலும்புகள் ஒப்பீடு' },
    summary: {
      en: 'A cervical, a thoracic and a lumbar vertebra side by side.',
      si: 'ගැබ්බර, උරස් හා කටි කශේරුකා තුනක් අසල අසල.',
      ta: 'கழுத்து, மார்பு, இடுப்பு முள்ளெலும்புகள் அருகருகே.',
    },
  },
];

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

async function main() {
  const present = new Set(await readdir(MODELS_DIR));
  const models = [];

  for (const entry of CATALOGUE) {
    if (!present.has(entry.file)) {
      process.stderr.write(`  missing ${entry.file}, skipping\n`);
      continue;
    }
    const path = join(MODELS_DIR, entry.file);
    const gltf = glbJson(await readFile(path));
    const bytes = (await stat(path)).size;

    // A node that references a mesh is a selectable structure.
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
    models.push({
      id: entry.id,
      file: entry.file,
      names: entry.names,
      summary: entry.summary,
      bytes,
      structures,
      bounds: lo[0] === Infinity ? null : [lo, hi].map((c) => c.map((n) => Math.round(n * 1e4) / 1e4)),
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
      `${(m.bytes / 1048576).toFixed(2)} MB\n`,
    );
  }
  process.stdout.write(`-> ${OUT}\n`);
}

main().catch((err) => {
  process.stderr.write(`build-study-models failed: ${err.message}\n`);
  process.exitCode = 1;
});
