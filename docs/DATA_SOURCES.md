# Where the anatomy comes from

`data-sources.json` is the machine-readable source of truth; CI reads it and
the interface renders credits from it. This file is the human explanation.

## Shipped

| Source | Licence | Grade | What it gives |
|---|---|---|---|
| BodyParts3D 4.0 | CC BY 4.0 | B | The whole body: 2,234 meshes, 15 systems, FMA-linked |
| Open3Dmodel | **CC BY-SA 4.0** | A | 5 reviewed study models, 234 named structures |
| Human Atlas (ashemag) | MIT | — | The conversion and chunk packing of the BodyParts3D meshes |

**The pack as a whole is CC BY-SA 4.0**, because Open3Dmodel is ShareAlike.
Anything built from it must carry the same licence. `check-licences.mjs`
reports this on every run.

## Collecting more

Neither anatomy host is reachable from a sandboxed build environment — both
`anatomytool.org` and `caskanatomy.info` are refused at the proxy gateway, as
is `dbarchive.biosciencedbc.jp`. Files are collected by hand and committed.

**Open3Dmodel** — https://anatomytool.org/open3dmodel-create — pick a region,
choose GLB. Credits for the project are at
https://anatomytool.org/open3dmodel-credit. Worth having next, in order of
what they add:

| Region | Closes |
|---|---|
| Upper limb | Brachial plexus and the limb nerves — the atlas has none |
| Lower limb | The sciatic nerve, likewise |
| Spinal cord section | Extends the 3 spinal cord meshes currently shipped |
| Head and neck | The thyroid gland, which is absent |
| Thorax, abdomen | Reviewed viscera where the body is only Grade B |

**Lungs** — no open source of lung *tissue* has been integrated. AnatomyTOOL
carries CT-derived *Normal lungs* and *Anatomy of the airways* models. These
would be the first geometry in the atlas from a source other than the three
above, so add an entry to `data-sources.json` with its licence before
shipping it, or `check-licences.mjs` will refuse the build.

## Excluded, deliberately

| Asset | Why |
|---|---|
| Open3Dmodel muscle textures | CC BY-NC-SA — NonCommercial would spread to the whole pack |
| University of Dundee inner ear | CC BY-NC-SA, same reason |
| Open3Dmodel web viewer source | GPL-3.0; incompatible with this MIT codebase. Only geometry is used |
| BodyParts3D publication figures | The paper is CC BY-NC 2.0 UK, unlike the data. Cite it; do not reuse figures |

## Terminology

Sinhala and Tamil names come from this project's own compiled list, not from
any upstream source — BodyParts3D and Open3Dmodel are English-only. Coverage
is reported by `validate-terms.mjs` on every run and is currently a small
fraction of the whole. No term may be marked reviewed without a named
reviewer behind it.
