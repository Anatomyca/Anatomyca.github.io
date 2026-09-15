# Anatomyca

A 3D map of the human body for Sri Lankan students, teachers and patients.
Turn the model, tap a bone or an organ, and read what it does — with the name
in English, Sinhala and Tamil.

Built to run as a plain static site on GitHub Pages: **no build step, no
bundler, no server, no accounts, no tracking.** Clone it, push it, done.

> **Name.** The app is called `Anatomyca`. To rename it, change `APP.name` in
> `src/config.js`, the `<title>` and the header/boot labels in `index.html`,
> and the `name` / `short_name` fields in `manifest.webmanifest`; nothing else
> reads it.

---

## What it does

- **Forty body parts** across nine systems — skeleton, nerves, heart and
  vessels, breathing, digestion, urinary, glands, lymphatic, and a
  see-through skin shell for orientation.
- **Trilingual naming.** Every part carries English, Sinhala and Tamil names;
  the whole interface switches language too.
- **Layer stripping.** Turn systems on and off to go from skin to skeleton.
- **See-through and cut-away dials.** Fade the body to a ghost, or slice it
  front-to-back, side-to-side or top-to-bottom with a live clipping plane.
- **Isolate.** Hide everything except the part you are studying.
- **Quiz mode.** The atlas asks, you tap. Eight rounds, drawn from whichever
  systems are currently visible.
- **Shareable links.** Selecting the liver puts `#liver` in the URL — paste it
  into a class group and it opens on the liver.
- **Works offline** after the first visit, and installs to a phone home screen.
- **Sri Lankan context** on the parts where it matters — CKDu and the dry
  zone, dengue and the spleen, iodised salt and the thyroid, betel quid and
  the jaw.

## Run it locally

Because it uses ES modules, open it through a server rather than
double-clicking the file:

```bash
python3 -m http.server 8080   # or: npm start
# then visit http://localhost:8080
```

Any static server works — `npx serve`, `php -S localhost:8080`, VS Code Live
Server.

## Put it on GitHub Pages

**The simple way**

1. Create a repository and push everything in this folder to `main`.
2. Repository → **Settings → Pages**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`.
4. Wait a minute, then open `https://<username>.github.io/<repo>/`.

Every path in the project is relative, so it works from a subfolder without
any base-path configuration. `.nojekyll` is included so that Jekyll does not
interfere with the files.

**With Actions instead**, if you prefer a deploy log: use GitHub's
*Static HTML* starter workflow and point it at the repository root. No build
command is needed.

### After deploying

The service worker caches the app on first visit. When you push changes, bump
`CACHE` in `sw.js` (e.g. `anatomyca-v2`) so returning visitors get the new
version instead of the cached one.

## How it is put together

```
index.html                 markup and the import map
styles.css                 all styling, one file, CSS custom properties
src/config.js              app name, systems, colours, camera presets
src/i18n.js                interface strings in en / si / ta
src/data.js                the content: every part, its names and text
src/geometry.js            procedural anatomy — every shape is generated
src/viewer.js              three.js scene, materials, picking, camera moves
src/ui.js                  rail, search, detail panel, sheet, keyboard
src/quiz.js                quiz mode
sw.js                      offline cache
vendor/three/              three.js r186, vendored (MIT)
models/                    optional real meshes, see models/README.md
tools/verify.mjs           builds every part in Node and checks placement
```

**Why procedural geometry?** A downloadable anatomy mesh set runs to hundreds
of megabytes and comes with licence conditions. Generating the shapes in code
keeps the repository at about 2.5 MB — roughly **460 KB over the wire** once
GitHub Pages compresses it, of which the atlas's own code is 30 KB — and
leaves the licensing clean. The trade-off is honest: these are
*recognisable teaching shapes in correct anatomical positions*, not
dissection-grade surfaces. When you want real meshes, see below — you can swap
them in one organ at a time.

### Performance notes

- One mesh per part, so a full body is under forty draw calls and about
  100,000 triangles.
- Frames are rendered **only when something changes** — a still model costs no
  battery.
- Device pixel ratio drops automatically if frames start running long.
- Raycasting happens on tap, and on hover only for mouse users, throttled.

## Adding or editing a part

1. Add an entry to `PARTS` in `src/data.js` — `id`, `sys`, `build`, names,
   `blurb`, `jobs`, optional `lk` note and `near` links.
2. Add a builder with the same key as `build` to `BUILDERS` in
   `src/geometry.js`. The helpers there — `capsule`, `blob`, `tube`, `dent` —
   cover most shapes. Units are metres on a 1.75 m body facing `+Z`.
3. Run `node tools/verify.mjs` to confirm it builds and sits inside the body.
   (The tool needs `three` resolvable; from the repo root:
   `mkdir -p node_modules && ln -s ../vendor/three node_modules/three`.)

To change tissue colour, edit `TINT` in `src/viewer.js`.

## Swapping in real anatomical meshes

See [`models/README.md`](models/README.md). Drop a GLB in `models/`, list which
mesh maps to which part id, and those parts are replaced at runtime while
everything else keeps working.

## Accuracy and use

This is a teaching aid. Shapes are simplified, and the text is general health
education — it is not clinical advice and must not be used for diagnosis or
for planning any procedure. The Sinhala and Tamil names follow standard
anatomical usage; have a teacher or clinician review them before you rely on
them in a classroom or an exam.

## Licence

Code: MIT (see `LICENSE`). three.js is bundled under its own MIT licence in
`vendor/three/LICENSE`. Fonts are served from Google Fonts under the SIL Open
Font License. All anatomical text here is original and written for this
project.
