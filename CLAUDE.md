# Anatomyca

A trilingual, offline-capable 3D anatomy atlas for Sri Lankan students.
Static site, no backend. See `README.md` for what it does.

## Read these before changing anatomy data

- `docs/GAP_ANALYSIS.md` — what is missing from the datasets and why,
  verified against the shipped files rather than their documentation.
- `docs/adding-models.md` — how to add a reviewed model.
- `docs/adr/` — why things are the way they are. 0003 and 0005 cover the
  geometry decisions.
- `data-sources.json` — every source, its licence, and the attribution its
  licensor requires. This is the single source of truth for credits.

## Rules that are not negotiable

- **Never invent geometry.** Every mesh must be traceable to a source listed
  in `data-sources.json`. A plausible-looking structure no anatomist has
  checked is worse than an absent one, because a student cannot tell.
- **Never let a term claim review without a named reviewer.**
  `validate-terms.mjs` enforces this.
- **Never add a NonCommercial asset.** One would spread its term to the whole
  geometry pack. `check-licences.mjs` enforces this.
- **State gaps in the interface.** A student who finds a system sparse should
  learn the dataset omits those structures, not conclude the atlas is broken.
  Notes live in `src/data/coverage-notes.json`.

## Network

Build environments here cannot reach `anatomytool.org`, `caskanatomy.info`,
`dbarchive.biosciencedbc.jp` or `query.wikidata.org` — all are refused at the
proxy. Model files are collected by hand and committed. Do not write code
that assumes those hosts are reachable at build or run time.

## Commands

```bash
npm run dev            # http://localhost:5173
npm run check          # typecheck and lint
npm test               # unit tests
npm run e2e            # end-to-end, five viewports
npm run atlas:models   # index study models, regenerate credits
npm run atlas:validate # atlas, terminology, licence and coverage gates
```
