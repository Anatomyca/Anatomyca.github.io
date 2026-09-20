#!/usr/bin/env node
/**
 * Fail the build if anything shipped carries a licence we have not approved.
 *
 * The rule that matters most: no NonCommercial asset may ever enter the
 * geometry pack. One NC file would spread its term to the whole pack and
 * block exactly the reuse this project exists for — schools, the NIE, other
 * Sri Lankan developers. This check is why that cannot happen by accident.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const SOURCES = 'data-sources.json';
const INTAKE_DIR = 'glb-files';
const INTAKE_MANIFEST = 'glb-files/sources.json';

/**
 * The drop-in folder is checked here as well as at build time, so a model
 * committed without its attribution fails the gate even if nobody reran the
 * indexer. A .glb that names no source cannot lawfully ship in this pack.
 */
async function checkIntake(config, approved, forbidden) {
  if (!existsSync(INTAKE_DIR)) return [];
  const problems = [];
  const files = (await readdir(INTAKE_DIR)).filter((f) => f.toLowerCase().endsWith('.glb'));
  const manifest = existsSync(INTAKE_MANIFEST)
    ? JSON.parse(await readFile(INTAKE_MANIFEST, 'utf8'))
    : { models: {} };
  const described = manifest.models ?? {};

  for (const file of files) {
    const entry = described[file];
    if (!entry) {
      problems.push(`${INTAKE_DIR}/${file}: no entry in ${INTAKE_MANIFEST}, so it has no attribution`);
      continue;
    }
    const source = config.sources?.[entry.source];
    if (!source) {
      problems.push(`${INTAKE_DIR}/${file}: source "${entry.source ?? ''}" is not defined in ${SOURCES}`);
      continue;
    }
    if (forbidden.has(source.licence)) {
      problems.push(`${INTAKE_DIR}/${file}: ${source.licence} is forbidden — ${forbidden.get(source.licence)}`);
    } else if (!approved.has(source.licence)) {
      problems.push(`${INTAKE_DIR}/${file}: ${source.licence} is not in approvedLicences`);
    }
    if (entry.grade === 'A' && !entry.reviewedBy?.trim()) {
      problems.push(`${INTAKE_DIR}/${file}: grade A claims review, but names no reviewer`);
    }
  }
  return problems;
}

async function main() {
  const config = JSON.parse(await readFile(SOURCES, 'utf8'));
  const approved = new Set(config.approvedLicences);
  const forbidden = new Map(config.forbiddenLicences.map((f) => [f.id, f.reason]));
  const problems = [];

  for (const [id, source] of Object.entries(config.sources)) {
    if (forbidden.has(source.licence)) {
      problems.push(`${id}: ${source.licence} is forbidden — ${forbidden.get(source.licence)}`);
      continue;
    }
    if (!approved.has(source.licence)) {
      problems.push(`${id}: ${source.licence} is not in approvedLicences`);
    }
    if (!source.attribution?.trim()) {
      problems.push(`${id}: no attribution string`);
    }
    if (!source.licenceUrl?.startsWith('http')) {
      problems.push(`${id}: no licence URL`);
    }
  }

  // The DBCLS wording is fixed by the licensor and must not drift.
  const REQUIRED_BP3D =
    'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
  if (config.sources['bodyparts3d']?.attribution !== REQUIRED_BP3D) {
    problems.push(
      'bodyparts3d: attribution must be reproduced verbatim as the licensor specifies:\n' +
      `  ${REQUIRED_BP3D}`,
    );
  }

  problems.push(...(await checkIntake(config, approved, forbidden)));

  // Any ShareAlike source in the pack makes the whole pack ShareAlike.
  const shareAlike = Object.entries(config.sources)
    .filter(([, s]) => s.shipped && s.licence.includes('SA'))
    .map(([id]) => id);

  if (problems.length > 0) {
    process.stderr.write('Licence check failed:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Licence check passed: ${Object.keys(config.sources).length} sources.\n` +
    (shareAlike.length
      ? `  Geometry pack is CC BY-SA 4.0 because it ships: ${shareAlike.join(', ')}\n`
      : '  No ShareAlike source shipped; the pack may stay CC BY 4.0.\n'),
  );
}

main().catch((err) => {
  process.stderr.write(`check-licences failed: ${err.message}\n`);
  process.exitCode = 1;
});
