#!/usr/bin/env node
/**
 * Turn the BodyParts3D tables into the compact trees the app loads.
 *
 * Two trees answer two different questions, and the atlas needs both:
 *   IS-A    "what kind of thing is this?" — drives filters (all bones, all
 *           muscles) and supplies plausible wrong answers for quizzes.
 *   PART-OF "where does this belong?" — drives breadcrumb navigation, which
 *           is how a student actually moves around the body.
 *
 * It also resolves every compound concept to its constituent element file
 * IDs. This matters more than it sounds: only atomic organs exist as meshes,
 * so tapping the body selects an element such as part of a ventricle wall,
 * while almost every syllabus term (heart, kidney, stomach) is a compound.
 * Pre-resolving the mapping is what lets "select the whole heart" highlight
 * instantly.
 *
 *   node scripts/build-hierarchy.mjs [--in <dir>] [--out <file>]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  ancestorsOf, buildTree, readElementParts, readPartsList, readRelations,
} from './lib/tables.mjs';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export async function buildHierarchy(inDir) {
  const parts = await readPartsList(join(inDir, 'isa_parts_list_e.txt'));
  const isaRelations = await readRelations(join(inDir, 'isa_inclusion_relation_list.txt'));
  const partofRelations = await readRelations(join(inDir, 'partof_inclusion_relation_list.txt'));
  const elementParts = await readElementParts(join(inDir, 'isa_element_parts.txt'));

  const isa = buildTree(isaRelations);
  const partof = buildTree(partofRelations);

  const concepts = parts.map(({ conceptId, fileId, name }) => ({
    id: conceptId,
    fileId,
    name,
    // A concept listed in element_parts is defined as a sum of other
    // meshes, so it is a compound; everything else is an atomic element.
    kind: elementParts.has(conceptId) ? 'compound' : 'element',
    elements: elementParts.get(conceptId) ?? [],
    isA: isa.parents.get(conceptId) ?? [],
    partOf: partof.parents.get(conceptId) ?? [],
    breadcrumb: ancestorsOf(conceptId, partof.parents),
  }));

  return {
    generatedAt: new Date().toISOString(),
    source: 'bodyparts3d',
    counts: {
      concepts: concepts.length,
      compounds: concepts.filter((c) => c.kind === 'compound').length,
      elements: concepts.filter((c) => c.kind === 'element').length,
      isaEdges: isaRelations.length,
      partofEdges: partofRelations.length,
    },
    concepts,
  };
}

async function main() {
  const inDir = arg('--in', 'data-src/bodyparts3d');
  const outFile = arg('--out', 'public/atlas/hierarchy.json');
  const result = await buildHierarchy(inDir);
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(result) + '\n');
  const { counts } = result;
  process.stdout.write(
    `hierarchy: ${counts.concepts} concepts ` +
    `(${counts.compounds} compound, ${counts.elements} element), ` +
    `${counts.isaEdges} IS-A and ${counts.partofEdges} PART-OF edges -> ${outFile}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`build-hierarchy failed: ${err.message}\n`);
    process.exitCode = 1;
  });
}
