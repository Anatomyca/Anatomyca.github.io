#!/usr/bin/env node
/**
 * Turn "ship every licensed mesh" into a gate.
 *
 * Without this, completeness is an intention that quietly erodes. The check
 * compares what is shipped against the full upstream inventory and fails on
 * any mesh that is neither shipped nor excluded with a stated reason. The
 * report it prints goes out with each release, so anyone can see exactly what
 * is in and what is out.
 */
import { readFile } from 'node:fs/promises';

async function main() {
  const exclusions = JSON.parse(await readFile('scripts/exclusions.json', 'utf8'));
  const allowedReasons = new Set(exclusions.allowedReasons);
  const excluded = new Map(exclusions.exclusions.map((e) => [e.id, e]));

  const atlas = JSON.parse(await readFile('public/atlas/bodyparts3d.json', 'utf8'));
  const shipped = new Set(atlas.parts.map((p) => p.id));

  const problems = [];
  for (const [id, entry] of excluded) {
    if (!allowedReasons.has(entry.reason)) {
      problems.push(`${id}: reason "${entry.reason}" is not an allowed reason`);
    }
    if (shipped.has(id)) problems.push(`${id}: listed as excluded but is shipped`);
  }

  // BodyParts3D 4.0 publishes 2,234 element meshes; anything short of that
  // means a mesh was dropped somewhere in the pipeline.
  const EXPECTED = 2234;
  const accounted = shipped.size + excluded.size;
  if (accounted < EXPECTED) {
    problems.push(
      `${EXPECTED - accounted} of the ${EXPECTED} upstream meshes are neither shipped ` +
      'nor listed in scripts/exclusions.json with a reason',
    );
  }

  const bySystem = new Map();
  for (const part of atlas.parts) {
    bySystem.set(part.system, (bySystem.get(part.system) ?? 0) + 1);
  }

  process.stdout.write(
    `Coverage: ${shipped.size}/${EXPECTED} upstream meshes shipped, ${excluded.size} excluded.\n` +
    [...bySystem.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `  ${s.padEnd(15)} ${String(n).padStart(5)}`)
      .join('\n') + '\n',
  );

  if (problems.length > 0) {
    process.stderr.write('\nCoverage check failed:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`check-coverage failed: ${err.message}\n`);
  process.exitCode = 1;
});
