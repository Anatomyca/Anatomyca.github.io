# 4. State coverage gaps, and derive the organs BodyParts3D only names in halves

Date: 2026-09-19

## Status

Accepted.

## Context

Testing the atlas against the structures a student actually searches for
turned up three different problems wearing the same disguise — "the organ is
not visible":

1. **Organs in systems that were never downloaded.** Selecting the brain
   opened a detail panel for an organ whose geometry had never been fetched.
   The reader saw a description of something that was not on screen.
2. **Organs with no whole-organ concept.** BodyParts3D names "right lung" and
   "left lung" but no "lung". Searching for lungs found nothing, which reads
   as all 280 lung meshes being absent when every one of them is present. The
   same held for the eye, hand, foot and 96 others.
3. **Organs genuinely absent from the dataset.** There is no thyroid gland,
   and the nervous system contains no peripheral nerves at all — no sciatic,
   vagus, facial or median nerve, no brachial plexus. What it has is 96 brain
   structures, 40 orbital nerves and the spinal cord.

Only the first two are ours to fix. The third is what BodyParts3D 4.0 is.

## Decision

Fix the first by loading a structure's system on selection. Fix the second by
deriving whole-organ concepts from left/right pairs, marked `derived` and
carrying a `PAIR-` id so their provenance stays separable from the
licensor's.

For the third, **say so in the interface**. Each system with a known gap
carries a note naming what is missing and which open dataset would close it.

## Consequences

A reader can reach every structure the dataset holds, and is told plainly
about the ones it does not.

The alternative for the third point was silence, and silence is the least
honest option available: a medical student who switches on the nervous system
and finds no sciatic nerve should learn that this release omits it, not
conclude that the atlas is broken or that the structure is unimportant. The
notes are written to be useful to a contributor as well — each names the
source that would fill the gap.

One deliberate restraint on the first fix: selection loads only the system
holding the structure, not every system its meshes touch. The heart reaches
into coronary arteries, cardiac veins and some muscle; fetching all of them
put 18 MB and several seconds of geometry building between a reader and the
organ they asked for. The rest stay one tap away in the rail.
