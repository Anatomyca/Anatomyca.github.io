#!/usr/bin/env node
/**
 * Download the BodyParts3D archives and tables into data-cache/.
 *
 * The download page warns that its FTP server is sometimes congested and
 * offers an alternative data directory, so both are tried in turn. Checksums
 * are recorded on the first successful download and verified on every later
 * run, which is what makes the pipeline reproducible.
 *
 * Nothing this script writes is ever committed. The IS-A archive is 136 MB,
 * past GitHub's 100 MB hard limit; only processed chunks enter the repo.
 *
 *   node scripts/fetch-bodyparts3d.mjs [--tables-only]
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';

const MIRRORS = [
  'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/',
  'ftp://ftp.biosciencedbc.jp/archive/bodyparts3d/LATEST/',
];

/** The six tables are small enough to commit; the archives are not. */
const TABLES = [
  'isa_parts_list_e.txt',
  'partof_parts_list_e.txt',
  'isa_inclusion_relation_list.txt',
  'partof_inclusion_relation_list.txt',
  'isa_element_parts.txt',
  'partof_element_parts.txt',
];

const ARCHIVES = [
  'isa_BP3D_4.0_obj_99.zip',
  'partof_BP3D_4.0_obj_99.zip',
];

const CACHE = 'data-cache/bodyparts3d';
const CHECKSUMS = 'data-src/bodyparts3d/checksums.json';

async function sha256(path) {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function download(name, dest) {
  let lastError;
  for (const base of MIRRORS) {
    if (base.startsWith('ftp://')) continue; // fetch() cannot speak FTP
    const url = base + name;
    try {
      process.stdout.write(`  ${name} <- ${base}\n`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('empty body');
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
      return;
    } catch (err) {
      lastError = err;
      process.stdout.write(`    failed: ${err.message}\n`);
    }
  }
  throw new Error(`Could not download ${name}: ${lastError?.message ?? 'no mirror reachable'}`);
}

async function main() {
  const tablesOnly = process.argv.includes('--tables-only');
  await mkdir(CACHE, { recursive: true });
  await mkdir('data-src/bodyparts3d', { recursive: true });

  const recorded = await exists(CHECKSUMS)
    ? JSON.parse(await readFile(CHECKSUMS, 'utf8'))
    : {};

  const wanted = tablesOnly ? TABLES : [...TABLES, ...ARCHIVES];
  let changed = false;

  for (const name of wanted) {
    // Tables live alongside the source data so reviewers can read them;
    // archives stay in the git-ignored cache.
    const dest = TABLES.includes(name)
      ? join('data-src/bodyparts3d', name)
      : join(CACHE, name);

    if (await exists(dest)) {
      const digest = await sha256(dest);
      if (recorded[name] && recorded[name] !== digest) {
        throw new Error(
          `${name} does not match its recorded checksum.\n` +
          `  expected ${recorded[name]}\n  found    ${digest}\n` +
          'Delete the file to re-download, or update checksums.json deliberately.',
        );
      }
      if (!recorded[name]) { recorded[name] = digest; changed = true; }
      process.stdout.write(`  ${name} present and verified\n`);
      continue;
    }

    await download(name, dest);
    recorded[name] = await sha256(dest);
    changed = true;
  }

  if (changed) {
    await writeFile(CHECKSUMS, JSON.stringify(recorded, null, 2) + '\n');
    process.stdout.write(`\nRecorded checksums in ${CHECKSUMS}\n`);
  }

  process.stdout.write(
    '\nReminder: save dated snapshots of the licence page and README_e.html\n' +
    'into docs/licences/. They are the provenance record for the CC BY 4.0 grant.\n',
  );
}

main().catch((err) => {
  process.stderr.write(`\nfetch-bodyparts3d failed: ${err.message}\n`);
  process.exitCode = 1;
});
