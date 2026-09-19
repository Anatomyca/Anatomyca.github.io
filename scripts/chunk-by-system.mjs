#!/usr/bin/env node
/**
 * Regroup the upstream geometry into one chunk per body system.
 *
 * Upstream packs parts into fifteen chunks in manifest order, which spreads
 * every system across nearly every chunk. That is fine when the viewer loads
 * all of it, but it makes per-system lazy loading impossible: asking for the
 * skeleton alone would pull 26 MB of the 31 MB total.
 *
 * Regrouping by system is what turns "show me the skeleton" into a download
 * proportional to the skeleton. Within each chunk the layout is unchanged —
 * Float32 positions, Int16 normals, Uint32 indices, 4-byte aligned — so the
 * runtime decoder stays exactly the same.
 *
 *   node scripts/chunk-by-system.mjs [--in <dir>] [--out <dir>]
 */
import { gunzipSync, gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const align4 = (n) => (n + 3) & ~3;

async function main() {
  const inDir = arg('--in', 'public/atlas');
  const outDir = arg('--out', 'public/atlas');
  const manifest = JSON.parse(await readFile(join(inDir, 'bodyparts3d.json'), 'utf8'));

  // Load every source chunk once.
  const sourceDir = join(inDir, 'chunks');
  const available = new Set(await readdir(sourceDir));
  const buffers = [];
  for (const [i, chunk] of manifest.chunks.entries()) {
    // Manifest paths have carried both /models/ and /chunks/ prefixes, and a
    // re-run reads the chunks this script itself wrote. The basename is the
    // only part that is stable across both, and it matches how the runtime
    // loader resolves them.
    const gzName = (chunk.gzip ?? chunk.url).split('/').pop();
    const rawName = chunk.url.split('/').pop();
    let data;
    if (available.has(gzName)) data = gunzipSync(await readFile(join(sourceDir, gzName)));
    else if (available.has(rawName)) data = await readFile(join(sourceDir, rawName));
    else throw new Error(`Chunk ${i} missing: looked for ${gzName} and ${rawName}`);
    if (data.byteLength !== chunk.bytes) {
      throw new Error(`Chunk ${i} is ${data.byteLength} bytes, manifest says ${chunk.bytes}`);
    }
    buffers.push(data);
  }

  // Group parts by system, largest system first so the report reads usefully.
  const bySystem = new Map();
  for (const part of manifest.parts) {
    if (!bySystem.has(part.system)) bySystem.set(part.system, []);
    bySystem.get(part.system).push(part);
  }

  const chunks = [];
  const parts = [];
  const report = [];

  for (const [system, systemParts] of bySystem) {
    // Lay out each part's three arrays back to back, keeping 4-byte alignment
    // so typed-array views over the result stay legal.
    let size = 0;
    const placed = [];
    for (const part of systemParts) {
      const positionsBytes = part.vertexCount * 3 * 4;
      const normalsBytes = part.vertexCount * 3 * 2;
      const indicesBytes = part.indexCount * 4;
      const positions = size;
      const normals = align4(positions + positionsBytes);
      const indices = align4(normals + normalsBytes);
      size = align4(indices + indicesBytes);
      placed.push({ part, positions, normals, indices, positionsBytes, normalsBytes, indicesBytes });
    }

    const out = Buffer.alloc(size);
    for (const p of placed) {
      const src = buffers[p.part.chunk];
      src.copy(out, p.positions, p.part.positions, p.part.positions + p.positionsBytes);
      src.copy(out, p.normals, p.part.normals, p.part.normals + p.normalsBytes);
      src.copy(out, p.indices, p.part.indices, p.part.indices + p.indicesBytes);
      parts.push({ ...p.part, chunk: chunks.length, positions: p.positions, normals: p.normals, indices: p.indices });
    }

    const gz = gzipSync(out, { level: 9 });
    const name = `system-${system}.bin`;
    await mkdir(join(outDir, 'chunks'), { recursive: true });
    await writeFile(join(outDir, 'chunks', `${name}.gz`), gz);

    chunks.push({ system, url: `/chunks/${name}`, bytes: size, gzip: `/chunks/${name}.gz`, gzipBytes: gz.byteLength });
    report.push({ system, parts: systemParts.length, mb: gz.byteLength / 1048576 });
  }

  const out = { ...manifest, chunks, parts, chunkedBy: 'system' };
  await writeFile(join(outDir, 'bodyparts3d.json'), JSON.stringify(out));

  report.sort((a, b) => b.mb - a.mb);
  process.stdout.write('Re-chunked by system:\n');
  for (const r of report) {
    process.stdout.write(`  ${r.system.padEnd(15)} ${String(r.parts).padStart(5)} parts  ${r.mb.toFixed(2)} MB\n`);
  }
  const total = report.reduce((s, r) => s + r.mb, 0);
  const over = chunks.filter((c) => c.gzipBytes > 20 * 1024 * 1024);
  process.stdout.write(`  ${'total'.padEnd(15)} ${String(parts.length).padStart(5)} parts  ${total.toFixed(2)} MB\n`);
  if (over.length > 0) {
    process.stderr.write(`\nChunks over the 20 MB limit: ${over.map((c) => c.system).join(', ')}\n`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`chunk-by-system failed: ${err.message}\n`);
  process.exitCode = 1;
});
