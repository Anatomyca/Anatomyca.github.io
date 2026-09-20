# What is missing, and why

Every claim here was checked against the shipped manifest, not inferred from
a dataset's documentation. Where a published description and the actual files
disagree, the files win and the disagreement is noted.

Regenerate the counts with `node scripts/validate-atlas.mjs` and
`node scripts/check-coverage.mjs`.

## Verified gaps

### Lungs — no lung tissue exists · **critical**

The respiratory system holds 119 meshes:

| | |
|---|---|
| Bronchial trees, to segmental level | 100 |
| Upper airway (nasal cavity, sinuses, pharynx) | 17 |
| Trachea | 1 |
| Larynx | 1 |
| **Lung parenchyma, lobes, pleura, alveoli** | **0** |

There is no lung surface anywhere in the 2,234 meshes. Even the concept
`upper lobe of right lung` resolves to 24 arteries, 21 bronchi and 17 veins —
no lobe. Selecting a lung shows its airways and vessels, which is everything
the dataset has.

> Some descriptions of BodyParts3D 4.0 state that segmented lungs were added
> in that release. In the pack distributed by the upstream Human Atlas
> project, they are not present. Checked directly; see the table above.

**What would fill it:** AnatomyTOOL's CT-derived *Normal lungs* and *Anatomy
of the airways* models, or a future Open3Dmodel thorax region.

### Peripheral nerves — none exist · **critical**

The nervous system holds 139 meshes: 96 brain structures, 40 orbital nerves,
3 spinal cord. There is no sciatic, vagus, facial, median, ulnar or radial
nerve and no brachial or lumbosacral plexus.

Candidate names that look like nerves are not: every mesh matching "femoral",
"ulnar", "radial" or "phrenic" belongs to the arterial, venous or skeletal
system. Zero are nervous.

**What would fill it:** Open3Dmodel's upper-limb and lower-limb regions, which
include newly modelled nerves, and its spinal cord section.

### Smaller gaps

| System | Has | Missing |
|---|---|---|
| Endocrine (4) | Pituitary, pineal, both adrenals | Thyroid, parathyroid |
| Lymphatic (3) | Spleen, both thymus lobes | Nodes, vessels |
| Reproductive (12) | Male only | Ovaries, uterus, the rest of female anatomy |
| Urinary (6) | Kidneys, ureters, bladder, urethra | Little beyond the gross organs |

## Not gaps

- **Whole organs that exist only as left/right halves.** BodyParts3D names
  "right lung" and "left lung" but no "lung". 99 such organs are derived from
  their pairs at build time and carry `PAIR-` ids. This looked like absence
  and was not.
- **Organs that are concepts rather than meshes.** The heart has no mesh; it
  gathers 83. Search covers concepts for this reason.

## How a gap gets closed

1. Collect the models by hand — see `docs/adding-models.md`. The hosts are
   unreachable from a sandboxed build environment.
2. Drop the GLB into `glb-files/` and describe it in `glb-files/sources.json`
   — filename, id, source, trilingual name and summary. The build refuses a
   model that names no source, so nothing ships unattributed.
3. `npm run atlas:models && npm run atlas:validate`.
4. Update this file and the system's note in `src/data/coverage-notes.json`.

Never add geometry that is not traceable to a listed source, and never model
a missing structure by hand: a plausible-looking nerve that no anatomist has
checked is worse than an absent one, because a student cannot tell.
