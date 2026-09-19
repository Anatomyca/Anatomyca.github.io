#!/usr/bin/env node
/**
 * Add whole-organ concepts for structures BodyParts3D only names in halves.
 *
 * The dataset has "right lung" and "left lung" but no "lung" — and the same
 * for the eye, the hand, the foot, the cerebral hemispheres and 95 others.
 * A student searching "lungs" finds nothing, which reads as the organ being
 * missing from the atlas when in fact all 280 of its meshes are present.
 *
 * So wherever exactly two sides exist and the whole does not, the whole is
 * derived from them. These carry a PAIR- id rather than an FMA one and are
 * marked `derived`, because the grouping is this project's, not the
 * licensor's — the geometry underneath is untouched.
 *
 *   node scripts/derive-paired-concepts.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const MANIFEST = 'public/atlas/bodyparts3d.json';

/** "left lung" -> "lung". Only these two words: "lateral" is not a side. */
const SIDE = /^(left|right)\s+(.+)$/;

const slug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const atlas = JSON.parse(await readFile(MANIFEST, 'utf8'));

  // Drop anything derived by an earlier run, so this script is repeatable.
  const original = atlas.concepts.filter((c) => !c.derived);
  const existing = new Set(original.map((c) => c.name.toLowerCase()));

  const sides = new Map();
  for (const concept of original) {
    const match = SIDE.exec(concept.name.toLowerCase());
    if (!match) continue;
    const base = match[2];
    if (!sides.has(base)) sides.set(base, []);
    sides.get(base).push(concept);
  }

  const derived = [];
  for (const [base, pair] of sides) {
    // Exactly two sides, and no whole-organ concept already.
    if (pair.length !== 2 || existing.has(base)) continue;
    const elements = [...new Set(pair.flatMap((c) => c.elements))];
    if (elements.length === 0) continue;
    derived.push({
      id: `PAIR-${slug(base)}`,
      name: base,
      elements,
      derived: true,
      sides: pair.map((c) => c.id),
    });
  }

  derived.sort((a, b) => b.elements.length - a.elements.length);
  atlas.concepts = [...original, ...derived];
  await writeFile(MANIFEST, JSON.stringify(atlas));

  process.stdout.write(
    `Derived ${derived.length} whole-organ concepts from left/right pairs.\n` +
    derived.slice(0, 8).map((c) => `  ${c.name.padEnd(28)} ${c.elements.length} meshes`).join('\n') +
    `\n  ...\nTotal concepts: ${atlas.concepts.length}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`derive-paired-concepts failed: ${err.message}\n`);
  process.exitCode = 1;
});
