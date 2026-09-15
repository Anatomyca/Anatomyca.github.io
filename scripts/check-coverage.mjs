#!/usr/bin/env node
/**
 * Turn "ship every licensed mesh" into a gate.
 *
 * Without this, completeness is an intention that quietly erodes. The check
 * compares what is shipped against the full inventory of every approved
 * source, and fails on any structure that is neither shipped nor excluded
 * with a stated reason. The report it prints is published with each release,
 * so anyone can see exactly what is in and what is out.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function main() {
  const exclusions = JSON.parse(await readFile('scripts/exclusions.json', 'utf8'));
  const allowedReasons = new Set(exclusions.allowedReasons);
  const excluded = new Map(exclusions.exclusions.map((e) => [e.id, e]));

  const shipped = (await import('../src/data/structures.ts')).SEED_STRUCTURES;
  const shippedIds = new Set(shipped.map((s) => s.id));

  // The upstream inventory only exists once the tables have been fetched.
  const HIERARCHY = 'public/atlas/hierarchy.json';
  const inventory = existsSync(HIERARCHY)
    ? JSON.parse(await readFile(HIERARCHY, 'utf8')).concepts.map((c) => c.id)
    : null;

  const problems = [];
  for (const [id, entry] of excluded) {
    if (!allowedReasons.has(entry.reason)) {
      problems.push(`${id}: reason "${entry.reason}" is not an allowed reason`);
    }
    if (shippedIds.has(id)) {
      problems.push(`${id}: listed as excluded but is shipped`);
    }
  }

  if (inventory === null) {
    process.stdout.write(
      `Coverage: ${shippedIds.size} structures shipped (procedural seed layer).\n` +
      `  No upstream inventory yet — ${HIERARCHY} is absent, so the BodyParts3D\n` +
      '  tables have not been fetched. Run: npm run atlas:fetch && npm run atlas:hierarchy\n',
    );
  } else {
    const missing = inventory.filter((id) => !shippedIds.has(id) && !excluded.has(id));
    process.stdout.write(
      `Coverage: ${shippedIds.size}/${inventory.length} upstream concepts shipped, ` +
      `${excluded.size} excluded, ${missing.length} unaccounted for.\n`,
    );
    if (missing.length > 0) {
      problems.push(
        `${missing.length} structures are neither shipped nor excluded, e.g. ` +
        missing.slice(0, 5).join(', ') +
        '. Import them, or list them in scripts/exclusions.json with a reason.',
      );
    }
  }

  if (problems.length > 0) {
    process.stderr.write('\nCoverage check failed:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`check-coverage failed: ${err.message}\n`);
  process.exitCode = 1;
});
