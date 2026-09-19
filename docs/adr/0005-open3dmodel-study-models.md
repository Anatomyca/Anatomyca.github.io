# 5. Ship the Open3Dmodel study models beside the body, not merged into it

Date: 2026-09-19

## Status

Accepted.

## Context

Five anatomist-reviewed Open3Dmodel exports became available: the full named
skeleton, the skull in three presentations, and three representative
vertebrae. 234 individually named structures, every one reviewed by one to
three subject-expert anatomists — **Grade A**, the standard the project has
been aiming at since ADR 0002.

They are already in the same space as the BodyParts3D body: metres, Y-up,
feet at zero, no node transforms. The skull sits at Y 1.50–1.71, where a head
belongs.

But they are not the same body. Open3Dmodel stands 1.70 m, BodyParts3D 1.75 m,
and their segmentation differs — 144 named bones against 296 bone meshes.
Drawing both at once would double every bone slightly out of register.

## Decision

Ship them as **alternative bodies**, chosen from a model picker, rather than
splicing them into the BodyParts3D skeleton.

Each is loaded on demand, framed to its own bounds, and searched in its own
right. The grade is on the face of every option in the picker.

## Consequences

A student revising bones or the skull gets reviewed geometry with correct
names, including individually named teeth, an exploded skull that shows the
sutures, and a cranial base that shows the foramina. That is a genuine
Grade A study tool, which the whole body is not.

**The geometry pack becomes CC BY-SA 4.0**, because Open3Dmodel is
ShareAlike. `check-licences` detects this and says so on every run. The
trade is recorded in LICENSE-DATA.md: ShareAlike is what buys anatomist
review, and it costs nothing that matters for a free, open project.

Merging the two bodies was rejected rather than deferred. Aligning them
would mean registering one skeleton onto another and deciding, per bone,
which segmentation wins — anatomical judgement this project cannot validate,
producing a body that is neither source's and carries neither's review. Two
honest bodies beat one silently reconciled one.

The models are lazily fetched, so a first visit is unchanged at about 9 MB;
the whole site grows from 34 MB to 42 MB. The Draco decoder is served from
the site rather than a CDN, so it still works offline.
