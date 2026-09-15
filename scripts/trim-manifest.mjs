#!/usr/bin/env node
/**
 * Shrink the manifest, which every visit downloads before anything renders.
 *
 * The bounds arrays arrive with full float64 printing — 0.027763999999999983
 * where 0.02776 is already finer than a millimetre on a 1.75 m body. Rounding
 * them costs nothing visible and takes a meaningful bite out of the one file
 * that is on the critical path for a first view.
 */
import { readFile, writeFile, stat } from 'node:fs/promises';

const MANIFEST = 'public/atlas/bodyparts3d.json';
const round = (n) => Math.round(n * 1e5) / 1e5;

const before = (await stat(MANIFEST)).size;
const atlas = JSON.parse(await readFile(MANIFEST, 'utf8'));

for (const part of atlas.parts) {
  part.bounds = part.bounds.map((corner) => corner.map(round));
}

await writeFile(MANIFEST, JSON.stringify(atlas));
const after = (await stat(MANIFEST)).size;

process.stdout.write(
  `manifest: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB ` +
  `(${(100 - (after / before) * 100).toFixed(0)}% smaller)\n`,
);
