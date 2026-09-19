# Data licence

The application code and the data are licensed separately, and deliberately.

## Application code — MIT

Everything under `src/`, `scripts/` and `tests/` is MIT, as in `LICENSE`.

## Geometry pack — CC BY-SA 4.0

**This changed when the Open3Dmodel study models were added.** They are
CC BY-SA 4.0, so the pack that includes them is CC BY-SA 4.0, and so is
anything that incorporates it.

That trade was taken with open eyes. A CC BY-only pack would be more freely
reusable. ShareAlike is accepted because it is what buys anatomist-reviewed
geometry — the difference between Grade B and Grade A, and the difference
between a reference a medical student can revise from and one they cannot
fully trust. ShareAlike also suits a public-good education dataset, and it
costs nothing that matters here, since the app is free and open in any case.

Contents and their licences:

| Part of the pack | Licence | Grade |
|---|---|---|
| BodyParts3D 4.0 whole body, 2,234 meshes | CC BY 4.0 | B |
| Open3Dmodel study models, 234 structures | **CC BY-SA 4.0** | A |
| Whole-organ concepts derived from left/right pairs | CC BY-SA 4.0 | — |

Anyone redistributing the pack, or a work built from it, must do so under
CC BY-SA 4.0 and carry the attributions in `public/ATTRIBUTION.md`.

Three rules follow, and `scripts/check-licences.mjs` enforces the third:

1. Application code stays MIT and stays separate from the data pack.
2. The trilingual terminology is released CC BY-SA 4.0 to match.
3. **No NonCommercial asset ever enters the pack.** A single NC file would
   spread its term to everything and block the school, NIE and government
   reuse this project exists to enable. The known NC assets — the University
   of Dundee inner ear, and the Open3Dmodel muscle textures — are named and
   excluded; original textures are to be commissioned or generated instead.

One further caution: Open3Dmodel's own web viewer is GPL-3.0. It is worth
reading for ideas, but no part of it may be copied into this MIT codebase.
Only its geometry is used here.
