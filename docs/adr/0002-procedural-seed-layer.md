# 2. Keep procedural geometry as the seed and Lite layer

Date: 2026-09-15

## Status

Accepted.

## Context

The plan's geometry strategy rests on BodyParts3D (Grade B) with Open3Dmodel
(Grade A) preferred wherever it exists. Neither can be fetched in every
environment, and the full pack will run to hundreds of megabytes across two
levels of detail — against a 100 GB/month bandwidth allowance that a 33 MB
cold load would exhaust in roughly 3,000 visits.

Separately, the project already owns forty-one structures of procedural
geometry with trilingual names, which render from about 1 MB of JavaScript.

## Decision

Keep the procedural layer as the seed and as the Lite tier. It ships in the
first load, renders with no mesh download, and carries **Grade C**: a
recognisable teaching shape in a correct anatomical position, not a
dissection-grade surface. Imported meshes supersede it per structure as they
arrive, raising that structure's grade to B or A.

## Consequences

The atlas is usable offline, on an entry-level phone, before any archive is
downloaded — currently 0.97 MB to first 3D view against a 5 MB budget.

The honesty cost is handled by the grading system rather than hidden: a
student always sees which tier of evidence they are looking at, and a Grade A
filter exists for anyone who needs only reviewed geometry.
