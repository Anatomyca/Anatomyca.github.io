#!/usr/bin/env node
/**
 * Terminology gate.
 *
 * The tiering exists because full expert review of 3,432 concepts in two
 * languages is a multi-year job. Tier 1 — everything in the O/L and A/L
 * syllabuses — is the part that must be right, so this check fails the build
 * if a Tier 1 structure claims a reviewed name without a named reviewer
 * behind it. Nothing may promote itself to 'reviewed'.
 */


const LANGS = ['si', 'ta'];

/**
 * Node 22 strips TypeScript types natively, so the scripts read exactly the
 * same module the app does. Parsing the source text instead would be
 * fragile — apostrophes inside the English descriptions alone would break it.
 */
async function readStructures() {
  const module = await import('../src/data/structures.ts');
  return module.SEED_STRUCTURES;
}

async function main() {
  const structures = await readStructures();
  const problems = [];
  const ids = new Set();

  for (const s of structures) {
    if (ids.has(s.id)) problems.push(`${s.id}: duplicate id`);
    ids.add(s.id);

    if (!s.names?.en?.trim()) problems.push(`${s.id}: no English name`);

    // A name must be NFC and must not be a bare placeholder.
    for (const lang of LANGS) {
      const name = s.names?.[lang];
      if (name && name.normalize('NFC') !== name) {
        problems.push(`${s.id}: ${lang} name is not NFC-normalised`);
      }
      if (name && /^[?\-\s]*$/.test(name)) {
        problems.push(`${s.id}: ${lang} name is a placeholder`);
      }
    }

    if (s.tier === 1) {
      for (const lang of LANGS) {
        if (!s.names?.[lang]?.trim()) {
          problems.push(`${s.id}: Tier 1 structure has no ${lang} name`);
        }
        // 'reviewed' is a claim about a person having checked it.
        if (s.status?.[lang] === 'reviewed' && !(s.reviewedBy?.[lang]?.length > 0)) {
          problems.push(
            `${s.id}: ${lang} name is marked reviewed but names no reviewer. ` +
            'Only a named reviewer may promote a term.',
          );
        }
      }
    }

    // Cross-references must resolve.
    for (const near of s.adjacent ?? []) {
      if (!structures.some((o) => o.id === near)) {
        problems.push(`${s.id}: adjacent id "${near}" does not exist`);
      }
    }
  }

  const tier1 = structures.filter((s) => s.tier === 1);
  const reviewed = Object.fromEntries(LANGS.map((lang) => [
    lang, tier1.filter((s) => s.status?.[lang] === 'reviewed').length,
  ]));

  process.stdout.write(
    `Terminology: ${structures.length} structures, ${tier1.length} in Tier 1.\n` +
    LANGS.map((l) => `  ${l}: ${reviewed[l]}/${tier1.length} reviewed`).join('\n') + '\n',
  );

  if (problems.length > 0) {
    process.stderr.write('\nTerminology check failed:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`validate-terms failed: ${err.message}\n`);
  process.exitCode = 1;
});
