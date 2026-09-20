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

## What is still missing

Two gaps in the shipped atlas need files that cannot be fetched from this
build environment (`anatomytool.org` is refused at the proxy), so they have to
be collected by hand and dropped here. `docs/GAP_ANALYSIS.md` has the full
verification.

| Gap | What to look for | Where |
| --- | --- | --- |
| **Lung tissue** | Lobes, fissures, pleura. BodyParts3D 4.0 ships bronchial trees and vessels but **zero** lung parenchyma — "upper lobe of right lung" resolves to 24 arteries, 21 bronchi and 17 veins. | AnatomyTOOL "Normal lungs", "Anatomy of the airways" |
| **Peripheral nerves** | Named nerve trunks of the limbs — femoral, sciatic, ulnar, radial, median. BodyParts3D 4.0 has 139 nervous meshes: 96 brain, 40 orbital, 3 spinal cord, and no limb nerves at all. | Open3Dmodel `upper-limb`, `lower-limb` |

Getting either into this folder closes a gap the interface currently has to
apologise for in `src/data/coverage-notes.json`.
