# Adding an Open3Dmodel study model

The atlas ships five reviewed models. Adding more takes two steps, and the
pipeline handles the rest.

## 1. Collect the GLB

Models come from https://anatomytool.org/open3dmodel-create — pick a region,
choose **GLB**, and download. The viewer at
`https://caskanatomy.info/open3dviewer/?model=<name>&export=on` exports the
same models.

Neither host is reachable from a sandboxed build environment, so this step is
done by hand.

**Models worth having next**, in order of what they add:

| Model | Why |
|---|---|
| `upper-limb` | Carries reviewed **limb nerves** — the atlas has none |
| `lower-limb` | Same, and the sciatic nerve in particular |
| `hand` | Fine structure a whole-body dataset cannot resolve |
| `thorax`, `abdomen` | Reviewed viscera, where the body is only Grade B |
| `head-neck` | Would supply the thyroid gland, which is absent |

## 2. Drop it in and describe it

```bash
cp upper-limb.glb glb-files/
# add an entry to glb-files/sources.json keyed by the filename
npm run atlas:models     # ingests glb-files/, regenerates the credits
npm run atlas:validate   # licence, terminology and coverage gates
```

`glb-files/` is the intake folder, and `glb-files/glb-readme.md` documents the
entry format. The entry names the model's `source`, which must be a key in
`data-sources.json` — that is where the licence and the licensor's required
attribution string live, so a model cannot claim a licence its source does not
carry, and the wording shown to students cannot drift from what the licensor
demands.

`scripts/build-study-models.mjs` reads each GLB's JSON chunk for node names and
per-mesh bounds, so no structure needs listing by hand. The trilingual display
name and one-line summary are the only parts a script cannot write for you.

Accepted files are copied into `public/atlas/models/`, which is what the app
serves. The five models that predate the intake folder are still listed in the
script's `CATALOGUE` array; either route works.

### What the intake refuses

A refusal fails the build rather than shipping something quietly wrong:

- a `.glb` with no entry in `sources.json` — an unattributed mesh in a
  CC BY-SA pack is a licence breach, and a mesh nobody can trace to a source
  is exactly what this project promises students it does not ship;
- an entry naming a source `data-sources.json` does not define;
- a source whose licence is NonCommercial, or otherwise outside
  `approvedLicences`;
- `grade: "A"` with no named `reviewedBy`;
- a missing Sinhala or Tamil name;
- a file that is not a valid GLB, or whose meshes carry no names.

`scripts/check-licences.mjs` repeats the attribution and licence checks, so a
model committed without its credit fails `npm run atlas:validate` even if
nobody reran the indexer.

## What the pipeline checks

- Every mesh gets a name; a nameless node is not selectable and is skipped.
- Bounds are read from the POSITION accessors, which Draco keeps in the JSON,
  so the index works without decoding geometry.
- `tests/unit/studyModels.test.ts` asserts each model stands in the same
  metres-and-Y-up space as the body. If a new one does not, switching to it
  would jump the camera, and that test is where you will find out.

## Credit and licence

Open3Dmodel is **CC BY-SA 4.0**. Anything added from it keeps the geometry
pack ShareAlike, and `scripts/check-licences.mjs` says so on every run.

`scripts/build-credits.mjs` regenerates what the interface shows from
`data-sources.json`. If a model names individual contributors — the
distributed GLB files carry no author metadata, so check the project's own
pages — add them to the `creators` array for `open3dmodel` there. Do not
invent names: crediting the wrong people is worse than crediting the
institutions.

**Never** add a NonCommercial asset. Open3Dmodel's muscle textures are
CC BY-NC-SA and are excluded for that reason; one NC file would spread its
term to the whole pack and block exactly the school and government reuse this
project exists to enable. `check-licences.mjs` fails the build if one appears.
