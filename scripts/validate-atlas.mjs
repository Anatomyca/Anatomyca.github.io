#!/usr/bin/env node
/**
 * Structural checks on the shipped anatomy.
 *
 * Every part must name a declared system, sit inside a chunk that exists,
 * and describe byte ranges that fall within that chunk. The last of these is
 * the one that matters most: an offset past the end of its buffer is a blank
 * screen at runtime with no useful error, so it is worth catching in CI.
 */
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MANIFEST = 'public/atlas/bodyparts3d.json';

async function main() {
  const atlas = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const config = JSON.parse(await readFile('data-sources.json', 'utf8'));
  const { BP3D_SYSTEMS } = await import('../src/atlas/systems.ts');

  const declared = new Set(BP3D_SYSTEMS.map((s) => s.id));
  const problems = [];

  if (!config.sources['bodyparts3d']?.shipped) {
    problems.push('data-sources.json does not list bodyparts3d as shipped');
  }

  // Every system present in the data must have a UI definition, or its parts
  // become unreachable: no rail entry means no way to switch it on.
  const present = new Set(atlas.parts.map((p) => p.system));
  for (const system of present) {
    if (!declared.has(system)) problems.push(`system "${system}" has no UI definition`);
  }

  const byIndex = new Map(atlas.chunks.map((c, i) => [i, c]));
  for (const part of atlas.parts) {
    const chunk = byIndex.get(part.chunk);
    if (!chunk) {
      problems.push(`${part.id}: chunk ${part.chunk} does not exist`);
      continue;
    }
    const ends = [
      part.positions + part.vertexCount * 3 * 4,
      part.normals + part.vertexCount * 3 * 2,
      part.indices + part.indexCount * 4,
    ];
    for (const end of ends) {
      if (end > chunk.bytes) {
        problems.push(`${part.id}: byte range ends at ${end}, past the ${chunk.bytes}-byte chunk`);
        break;
      }
    }
    if (part.positions % 4 !== 0 || part.indices % 4 !== 0) {
      problems.push(`${part.id}: offsets are not 4-byte aligned, so typed views would throw`);
    }
  }

  // Concepts are what students search for, so a dangling element reference
  // would silently shrink a selection.
  let danglingElements = 0;
  const partIds = new Set(atlas.parts.map((p) => p.id));
  for (const concept of atlas.concepts) {
    for (const element of concept.elements) {
      if (!partIds.has(element)) danglingElements++;
    }
  }

  // Each chunk file has to actually be there.
  for (const chunk of atlas.chunks) {
    const name = (chunk.gzip ?? chunk.url).split('/').pop();
    try {
      await stat(join('public/atlas/chunks', name));
    } catch {
      problems.push(`chunk file ${name} is missing`);
    }
  }

  process.stdout.write(
    `Atlas: ${atlas.parts.length} meshes, ${atlas.concepts.length} concepts, ` +
    `${atlas.chunks.length} chunks, ${present.size} systems.\n` +
    `  ${atlas.triangles.toLocaleString()} triangles, simplified from ` +
    `${atlas.sourceTriangles.toLocaleString()}.\n` +
    (danglingElements > 0
      ? `  ${danglingElements} concept element references point at meshes not in this release.\n`
      : ''),
  );

  if (problems.length > 0) {
    process.stderr.write('\nAtlas check failed:\n' + problems.slice(0, 20).map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`validate-atlas failed: ${err.message}\n`);
  process.exitCode = 1;
});
