# Drop GLB models here

This folder is the intake point for new 3D models. Put a `.glb` file in here,
describe it in `sources.json`, run one command, and it becomes a study model in
the atlas — indexed, credited, and licence-checked.

```bash
npm run atlas:models     # ingest this folder, then regenerate credits
npm run atlas:validate   # licence, coverage and terminology gates
```

Nothing here is served to the browser. The build copies accepted files into
`public/atlas/models/` and writes the index the app actually loads.

## The two steps

**1. Put the file in this folder.** Keep the name lowercase with hyphens:
`lungs-lobes.glb`, not `Lungs Lobes (final) v2.GLB`.

**2. Add an entry to `sources.json`** under `models`, keyed by that filename.
A file with no entry is refused, and the build fails rather than quietly
skipping it. That is deliberate: an unattributed mesh in a CC BY-SA pack is a
licence breach, and a mesh nobody can trace to a source is exactly the thing
this project promises students it does not ship.

```json
"lungs-lobes.glb": {
  "id": "lungs",
  "source": "open3dmodel",
  "names": { "en": "Lungs", "si": "පෙනහළු", "ta": "நுரையீரல்கள்" },
  "summary": {
    "en": "The five lobes, with the fissures between them.",
    "si": "...",
    "ta": "..."
  },
  "grade": "A",
  "reviewedBy": "Anatomy department, Leiden UMC",
  "sourceUrl": "https://anatomytool.org/..."
}
```

`source` must name a key in the repository's `data-sources.json`. That is where
the licence and the exact attribution string live, so a model can never claim a
licence its source does not carry, and the wording shown to students cannot
drift from what the licensor requires. If the model comes from somewhere not
listed there yet, add the source to `data-sources.json` first.

`grade` is `A` only with a named `reviewedBy` — an institution or a person who
checked the anatomy. Without one, use `B`. The interface shows this to the
student, so it has to be true.

## What the build refuses

- A `.glb` with no entry in `sources.json`.
- An entry naming a `source` that `data-sources.json` does not define.
- A source whose licence is NonCommercial. One NC file would spread its term to
  the whole geometry pack and block the school and NIE reuse this project
  exists for.
- `grade: "A"` with no `reviewedBy`.
- A file that is not a valid GLB, or whose meshes carry no names. Unnamed
  meshes make a picture, not a study tool — the names are what a student
  clicks.

## What is here now

Twelve community models from Sketchfab, each CC BY 4.0 and credited to its
author in the interface. They are **Grade C**: an artist made them and no
anatomist has checked them, which the badge says wherever they appear.

They were committed raw (237 MB) and compressed in place to 18 MB with
`gltf-transform optimize --texture-compress webp --compress draco --join false`.
`--join false` matters: without it the optimiser merges meshes and
`human_skeleton_named.glb` collapses from 183 named bones to one blob, which
is the whole reason that model is worth having. The originals are in git at
commit `f6bc2fa` if a better compression pass is ever wanted.

## What was refused, and why

| File | Reason |
| --- | --- |
| `realistic_human_stomach.glb` | **CC BY-NC 4.0.** A NonCommercial term spreads to the whole geometry pack and blocks school and NIE reuse. |
| `types_of_human_teeth.glb` | **Sketchfab Standard**, a proprietary licence that forbids redistributing the file — which is what an offline atlas does. |
| `human_dna.glb` | Not anatomy. 1,590 meshes named `Cube.134`. |
| `human_mouth_detailed.glb` | 32 MB, byte-for-byte the same geometry as the 6 MB variant; only the textures differ. |
| `medicine_organ_-_the_human_kidney.glb` | 26 MB for 7,413 triangles; `human_kidney.glb` is 0.3 MB for 38,040. |
| the five Open3Dmodel files | Already shipped from `public/atlas/models/`. |

The first two were deleted from the working tree, not merely skipped: keeping
a NonCommercial file and a no-redistribution file in a public repository is
itself distributing them. They remain in git history at `f6bc2fa`; purging
that needs a history rewrite of `main`, which is your call.

## What is still missing

Two gaps in the shipped atlas need files that cannot be fetched from this
build environment (`anatomytool.org` is refused at the proxy), so they have to
be collected by hand and dropped here. `docs/GAP_ANALYSIS.md` has the full
verification.

| Gap | What to look for | Where |
| --- | --- | --- |
| **Lobed lungs a specialist has checked** | The Lungs model now gives the organ's outer form, but it is an artist's work and its lobes are not separated. The reference dataset still has **zero** parenchyma — "upper lobe of right lung" resolves to 24 arteries, 21 bronchi and 17 veins. | AnatomyTOOL "Normal lungs", "Anatomy of the airways" |
| **Peripheral nerves** | Named nerve trunks of the limbs — femoral, sciatic, ulnar, radial, median. BodyParts3D 4.0 has 139 nervous meshes: 96 brain, 40 orbital, 3 spinal cord, and no limb nerves at all. | Open3Dmodel `upper-limb`, `lower-limb` |

Getting either into this folder closes a gap the interface currently has to
apologise for in `src/data/coverage-notes.json`.
