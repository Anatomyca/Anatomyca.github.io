#!/usr/bin/env node
/**
 * Enforce the payload budgets.
 *
 * These are not tidiness targets. GitHub Pages allows 100 GB of bandwidth a
 * month; keeping a first visit small is what makes the project survivable on
 * free hosting, and what keeps a prepaid data package intact.
 *
 * Three numbers are measured separately, because they answer different
 * questions:
 *
 *   shell      what must arrive before anything at all can be drawn
 *   firstView  shell plus the systems shown by default — what a student
 *              actually pays to open the atlas
 *   site       the whole published site, against the 1 GB Pages limit
 *
 * Text assets are counted gzipped, because Pages compresses them on the way
 * out. Geometry chunks are already gzip on disk, so they count as they are.
 *
 *   node scripts/check-size-budget.mjs dist
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, extname, basename, sep } from 'node:path';

const BUDGETS = {
  shellJsGzip: 300 * 1024,
  shell: 3 * 1024 * 1024,
  // Raised from the original 5 MB when the procedural seed layer was replaced
  // by 2,234 real BodyParts3D meshes. The whole body is 32 MB; showing a
  // recognisable one costs a third of that, and every other system streams
  // only when asked for. See docs/adr/0003-bodyparts3d-geometry.md.
  firstView: 12 * 1024 * 1024,
  perChunk: 20 * 1024 * 1024,   // also satisfies jsDelivr's per-file limit
  siteTotal: 700 * 1024 * 1024, // hard ceiling is 1 GB
};

/** Systems loaded on a first visit. Mirrors LITE_SYSTEMS in src/atlas. */
const DEFAULT_SYSTEMS = [
  'skeletal', 'cardiac', 'respiratory', 'digestive',
  'urinary', 'endocrine', 'lymphatic', 'integumentary',
];

const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.json', '.svg']);

/**
 * Fetched on demand, so they are not part of what a first visit costs: the
 * study models are chosen deliberately from the model picker, and the Draco
 * decoder only loads with the first of them.
 */
const LAZY = ['atlas/chunks', 'atlas/models', 'draco/'];

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
  let shell = 0;
  let defaultChunks = 0;

  for (const file of files) {
    const size = (await stat(file)).size;
    siteTotal += size;

    const normalised = file.split(sep).join('/');
    const isChunk = normalised.includes('atlas/chunks');
    const isLazy = LAZY.some((prefix) => normalised.includes(prefix));
    if (isLazy) {
      if (size > BUDGETS.perChunk) {
        problems.push(`${file} is ${mb(size)}, over the ${mb(BUDGETS.perChunk)} per-chunk limit`);
      }
      if (isChunk) {
        const system = basename(file).replace(/^system-|\.bin\.gz$/g, '');
        if (DEFAULT_SYSTEMS.includes(system)) defaultChunks += size;
      }
      continue;
    }

    // Everything that is not a lazily fetched chunk has to arrive up front.
    const ext = extname(file);
    const wireSize = COMPRESSIBLE.has(ext) ? gzipSync(await readFile(file)).length : size;
    shell += wireSize;
    if (ext === '.js') shellJsGzip += wireSize;
  }

  const firstView = shell + defaultChunks;

  if (shellJsGzip > BUDGETS.shellJsGzip) {
    problems.push(`shell JavaScript is ${kb(shellJsGzip)} gzipped, over ${kb(BUDGETS.shellJsGzip)}`);
  }
  if (shell > BUDGETS.shell) {
    problems.push(`shell is ${mb(shell)}, over ${mb(BUDGETS.shell)}`);
  }
  if (firstView > BUDGETS.firstView) {
    problems.push(`first view is ${mb(firstView)}, over ${mb(BUDGETS.firstView)}`);
  }
  if (siteTotal > BUDGETS.siteTotal) {
    problems.push(`site is ${mb(siteTotal)}, over ${mb(BUDGETS.siteTotal)}`);
  }

  process.stdout.write(
    'Size budget (text counted gzipped, as Pages serves it):\n' +
    `  shell JS         ${kb(shellJsGzip).padStart(12)}  / ${kb(BUDGETS.shellJsGzip)}\n` +
    `  shell total      ${mb(shell).padStart(12)}  / ${mb(BUDGETS.shell)}\n` +
    `  first view       ${mb(firstView).padStart(12)}  / ${mb(BUDGETS.firstView)}` +
    `   (shell + ${DEFAULT_SYSTEMS.length} default systems)\n` +
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
