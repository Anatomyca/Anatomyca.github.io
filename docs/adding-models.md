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

## 2. Drop it in and rebuild the index

```bash
cp upper-limb.glb public/atlas/models/
npm run atlas:models     # indexes the GLB and regenerates the credits
npm run atlas:validate    # licence, terminology and coverage gates
```

`scripts/build-study-models.mjs` reads each GLB's JSON chunk for node names
and per-mesh bounds, so nothing needs listing by hand. It will report the new
model as unlisted until you add an entry to its `CATALOGUE` array giving the
id, the trilingual display name and the one-line summary — that text is the
only part a script cannot write for you.

CI runs both scripts, so a GLB added without an entry fails the build rather
than shipping unnamed.

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
