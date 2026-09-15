# Bringing in real meshes

The atlas generates its shapes in code, so it works with this folder empty.
If you later want anatomically exact surfaces — from BodyParts3D/Anatomography,
Z-Anatomy, or your own sculpts — you can swap them in part by part without
touching any other file.

## How

1. Export or convert your meshes to a single **`.glb`** (Blender: File →
   Export → glTF Binary). Keep mesh names meaningful; those names are the
   link.
2. Put the file in this folder.
3. Create `models/manifest.json`:

```json
{
  "scale": 0.01,
  "offset": [0, 0, 0],
  "files": {
    "organs.glb": {
      "heart": "Heart_mesh",
      "liver": "Liver_mesh",
      "lungs": "Lungs_combined"
    }
  }
}
```

- `scale` converts your units to metres (BodyParts3D exports are usually in
  millimetres, so `0.001`).
- `offset` shifts the mesh so the body stands with feet at `y = 0`, facing
  `+Z`, centred on `x = 0`.
- Keys inside a file are **part ids** from `src/data.js`; values are **mesh
  names** inside the GLB.

Reload. Listed parts use your mesh; everything else stays procedural. The
manifest loads *after* the body appears, so a large file never blocks the
first view.

## Getting the alignment right

Load one organ first — the skull is easiest to judge. Tune `scale`, then
`offset`. Useful landmarks in this model:

| landmark        | y     |
|-----------------|-------|
| floor           | 0.00  |
| knee            | 0.48  |
| hip joint       | 0.90  |
| navel           | 1.08  |
| diaphragm dome  | 1.23  |
| nipple line     | 1.32  |
| shoulder        | 1.44  |
| chin            | 1.56  |
| crown           | 1.75  |

## Licensing

Check the terms of whatever mesh set you use and credit it in the README.
BodyParts3D, for instance, is CC BY-SA — which means your repository would
need to carry that attribution and share-alike condition. That is exactly why
nothing here ships with a mesh by default.

## Size advice

GitHub Pages serves a 1 GB repository with a soft 100 MB per-file limit, and
every visitor downloads what you ship. Compress with Draco or meshopt in
Blender's export options and keep the whole set well under 20 MB. If you use
Draco, also vendor `vendor/three/addons/loaders/DRACOLoader.js` plus the
decoder and set it on the loader in `viewer.js`.
