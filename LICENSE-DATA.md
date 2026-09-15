# Data licence

The application code and the data are licensed separately, and deliberately.

## Application code — MIT

Everything under `src/`, `scripts/` and `tests/` is MIT, as in `LICENSE`.

## Geometry pack — see below

The geometry currently shipped is generated in code by this project and is
also MIT.

**This changes the moment Open3Dmodel or Z-Anatomy geometry is merged in.**
Both are CC BY-SA 4.0, so the pack that includes them must itself be
CC BY-SA 4.0, and so must anything that incorporates it.

That is a real trade-off and it is taken with open eyes. A CC BY-only pack
would be more freely reusable. ShareAlike is accepted because it is what buys
anatomist-reviewed geometry — the difference between Grade B and Grade A — and
because ShareAlike suits a public-good education dataset. It costs nothing
that matters here, since the app is free and open in any case.

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
