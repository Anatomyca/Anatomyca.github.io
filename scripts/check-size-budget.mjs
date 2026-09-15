#!/usr/bin/env node
/**
 * Enforce the payload budgets.
 *
 * These are not tidiness targets. GitHub Pages allows 100 GB of bandwidth a
 * month; at the reference tool's ~33 MB cold load that is roughly 3,000
 * first-time visitors, which A/L students near exam season would exhaust in
 * days. Keeping the first view small is what makes the project survivable on
 * free hosting, and it is what keeps a prepaid data package intact.
 *
 *   node scripts/check-size-budget.mjs dist
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, extname } from 'node:path';

const BUDGETS = {
  shellJsGzip: 300 * 1024,      // app shell JavaScript, gzipped
  firstViewTotal: 5 * 1024 * 1024, // everything needed for the first 3D view
  perChunk: 20 * 1024 * 1024,   // also satisfies jsDelivr's per-file limit
  siteTotal: 700 * 1024 * 1024, // hard ceiling is 1 GB
};

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const root = process.argv[2] ?? 'dist';
  const files = await walk(root);
  const problems = [];

  let siteTotal = 0;
  let shellJsGzip = 0;
  let firstView = 0;

  for (const file of files) {
    const size = (await stat(file)).size;
    siteTotal += size;

    const isChunk = file.includes('atlas/chunks');
    if (isChunk && size > BUDGETS.perChunk) {
      problems.push(`${file} is ${mb(size)}, over the ${mb(BUDGETS.perChunk)} per-chunk limit`);
    }

    // The first view needs the shell and everything not lazily fetched.
    if (!isChunk) {
      firstView += size;
      if (extname(file) === '.js') {
        shellJsGzip += gzipSync(await readFile(file)).length;
      }
    }
  }

  if (shellJsGzip > BUDGETS.shellJsGzip) {
    problems.push(`shell JavaScript is ${kb(shellJsGzip)} gzipped, over ${kb(BUDGETS.shellJsGzip)}`);
  }
  if (firstView > BUDGETS.firstViewTotal) {
    problems.push(`first view is ${mb(firstView)}, over ${mb(BUDGETS.firstViewTotal)}`);
  }
  if (siteTotal > BUDGETS.siteTotal) {
    problems.push(`site is ${mb(siteTotal)}, over ${mb(BUDGETS.siteTotal)}`);
  }

  process.stdout.write(
    `Size budget:\n` +
    `  shell JS (gzip)  ${kb(shellJsGzip).padStart(12)}  / ${kb(BUDGETS.shellJsGzip)}\n` +
    `  first 3D view    ${mb(firstView).padStart(12)}  / ${mb(BUDGETS.firstViewTotal)}\n` +
    `  whole site       ${mb(siteTotal).padStart(12)}  / ${mb(BUDGETS.siteTotal)}\n`,
  );

  if (problems.length > 0) {
    process.stderr.write('\nOver budget:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`check-size-budget failed: ${err.message}\n`);
  process.exitCode = 1;
});
