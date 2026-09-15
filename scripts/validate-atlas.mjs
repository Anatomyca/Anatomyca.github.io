#!/usr/bin/env node
/**
 * Structural checks on the atlas data itself: every structure must name a
 * system that exists, a source that is declared in data-sources.json, a
 * grade consistent with that source, and a builder that exists when it
 * claims procedural geometry.
 */
import { readFile } from 'node:fs/promises';

async function main() {
  const { SEED_STRUCTURES, SYSTEMS } = await import('../src/data/structures.ts');
  const { BUILDERS } = await import('../src/three/geometry.ts');
  const config = JSON.parse(await readFile('data-sources.json', 'utf8'));

  const systemIds = new Set(SYSTEMS.map((s) => s.id));
  const problems = [];

  for (const s of SEED_STRUCTURES) {
    if (!systemIds.has(s.system)) {
      problems.push(`${s.id}: unknown system "${s.system}"`);
    }
    const source = config.sources[s.source];
    if (!source) {
      problems.push(`${s.id}: source "${s.source}" is not declared in data-sources.json`);
    } else if (source.grade !== s.grade) {
      problems.push(
        `${s.id}: grade ${s.grade} contradicts its source, which is graded ${source.grade}`,
      );
    }
    if (s.source === 'anatomyca-procedural' && !(s.build in BUILDERS)) {
      problems.push(`${s.id}: no procedural builder named "${s.build}"`);
    }
  }

  const byGrade = {};
  for (const s of SEED_STRUCTURES) byGrade[s.grade] = (byGrade[s.grade] ?? 0) + 1;

  process.stdout.write(
    `Atlas: ${SEED_STRUCTURES.length} structures across ${SYSTEMS.length} systems.\n` +
    '  by grade: ' + Object.entries(byGrade).map(([g, n]) => `${g}=${n}`).join(', ') + '\n',
  );

  if (problems.length > 0) {
    process.stderr.write('\nAtlas check failed:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`validate-atlas failed: ${err.message}\n`);
  process.exitCode = 1;
});
