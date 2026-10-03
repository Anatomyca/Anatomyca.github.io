#!/usr/bin/env node
/**
 * Lift a handful of real concepts out of the shipped manifest for the
 * selection tests.
 *
 * The classification rules are about what the actual data looks like — which
 * meshes a concept gathers, how many triangles each carries, which system
 * they were chunked into. A hand-written fixture would assert against a
 * world we invented, and would keep passing after the data moved underneath
 * it. These are the real rows.
 *
 * Geometry is dropped: the rules read names, systems and triangle counts, and
 * carrying the vertex buffers would make the fixture tens of megabytes.
 *
 *   node scripts/build-selection-fixture.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const MANIFEST = 'public/atlas/bodyparts3d.json';
const OUT = 'tests/fixtures/selection.json';

/**
 * Chosen for what each one proves, not for coverage:
 *
 *   heart, liver        organs whose own meshes must outvote their vessels
 *   brain, spleen,      plain cases that must not regress
 *   kidney
 *   lungs and lobes     organs the dataset models only as blood supply and
 *                       airways — the case that sent them to "Arteries"
 *   liver lobes         same, through the hepatic veins
 *   vascular systems    concepts that name themselves vessels and must stay
 *                       vessels when the tissue rule would move them
 *   a ventricle         the word that would be read as a vein by a looser
 *                       match than the one the rule uses
 */
const WANTED = [
  'liver', 'heart', 'brain', 'spleen', 'kidney',
  'left lung', 'right lung', 'upper lobe of left lung', 'lower lobe of right lung',
  'left lobe of liver', 'right lobe of liver',
  'portal venous system', 'systemic arterial system',
  'aorta', 'great cardiac vein',
  'cavity of left ventricle',
];

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const partsById = new Map(manifest.parts.map((part) => [part.id, part]));

  const concepts = [];
  const missing = [];
  for (const name of WANTED) {
    const concept = manifest.concepts.find((c) => c.name === name);
    if (concept) concepts.push(concept);
    else missing.push(name);
  }

  // Every element any kept concept reaches, so resolution has real rows.
  const keep = new Map();
  for (const concept of concepts) {
    for (const element of concept.elements) {
      const part = partsById.get(element);
      if (part) keep.set(part.id, part);
    }
  }

  const parts = [...keep.values()].map((part) => ({
    ...part,
    // The rules never read geometry; the counts they do read stay.
    positions: '', normals: '', indices: '',
  }));

  await writeFile(OUT, `${JSON.stringify({ concepts, parts })}\n`);

  process.stdout.write(
    `Selection fixture: ${concepts.length} concepts, ${parts.length} parts -> ${OUT}\n`,
  );
  if (missing.length > 0) {
    process.stderr.write(
      `  not in the manifest, so not in the fixture: ${missing.join(', ')}\n`,
    );
  }
}

main().catch((err) => {
  process.stderr.write(`build-selection-fixture failed: ${err.message}\n`);
  process.exitCode = 1;
});
