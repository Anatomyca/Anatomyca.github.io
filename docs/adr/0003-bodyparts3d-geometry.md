# 3. Ship the BodyParts3D body, re-chunked by system

Date: 2026-09-15

## Status

Accepted. Supersedes the geometry decision in ADR 0002.

## Context

The procedural seed layer did what it was designed to do — render instantly,
with no download and no licence entanglement — but it was never more than
recognisable teaching shapes, and it graded C for that reason. For medical,
nursing and allied-health students, who are the audience this project needs
to serve, that is not good enough: they need real anatomical surfaces.

The upstream Human Atlas project publishes the BodyParts3D 4.0 body already
converted for the web: 2,234 element meshes, 2.29 million triangles simplified
from 6.68 million, metres and Y-up, normals quantised to signed 16-bit. Its
code is MIT and the geometry is CC BY 4.0, so both can be used with
attribution.

Its fifteen chunks are packed in manifest order, which spreads every system
across nearly every chunk. Loading the skeleton alone would have pulled 26 MB
of the 31 MB total.

## Decision

Ship the full BodyParts3D body as the primary geometry at **Grade B**, and
re-chunk it by body system so that each system is one download.

Keep the procedural layer only as the source of the trilingual seed names;
retire it as geometry.

## Consequences

The atlas is now a real anatomical reference: every structure carries an FMA
concept id, and selecting the heart selects the 83 element meshes that
compose it rather than a single approximated shape.

Per-system chunking is what makes the size workable. A first visit costs
about 9 MB for a recognisable body — skeleton, heart, breathing, digestion,
urinary, glands, lymphatic and the surface shell — and the vascular trees,
muscles and nerves stream only when asked for. The **first-view budget rises
from 5 MB to 12 MB**, which is a deliberate trade and should be revisited if
a decimated Lite tier is built later.

Two costs are worth stating plainly. The whole site is now 34 MB rather than
1 MB, so the jsDelivr mirror moves from optional to necessary before any
publicity. And the trilingual layer now reaches only a fraction of what is
shipped — 35 of 3,432 concepts — because BodyParts3D supplies English names
only. Everything else shows its English name until a reviewer supplies one,
which the interface states rather than hides.
