# Attribution

Anatomyca is built from openly licensed work. The wording below is reproduced
as each licensor requires; where a licensor specifies exact text, that text is
stored once in `data-sources.json` and rendered from there, so it cannot drift.

## Geometry currently shipped

**Open3Dmodel study models** — CC BY-SA 4.0. Five anatomist-reviewed models
carrying 234 individually named structures: the full skeleton, the skull in
three presentations (coloured, exploded, and the cranial base), and three
representative vertebrae. Graded **A** — every structure reviewed by one to
three subject-expert anatomists against Moore, Gray, Netter, Prometheus,
Sobotta, dissection specimens and the literature.

> Open3Dmodel, by the anatomy departments of Leiden UMC, UMC Utrecht,
> Maastricht, KU Leuven, Amsterdam UMC, Radboud UMC and Ghent, licensed
> under CC BY-SA 4.0

https://anatomytool.org/open3dmodel-about

Because these are ShareAlike, **the whole geometry pack is CC BY-SA 4.0**.
See [`LICENSE-DATA.md`](../LICENSE-DATA.md).

Only the geometry is used. Open3Dmodel's own web viewer is GPL-3.0 and no
part of it appears in this codebase; its muscle textures are NonCommercial
and are excluded.


**BodyParts3D Release 4.0** — CC BY 4.0. The whole body: 2,234 element
meshes across fifteen systems, 2,288,268 triangles simplified from 6,681,030,
carrying 3,432 named FMA concepts. Graded **B** throughout — a published
reference dataset, not individually reviewed by anatomists.

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

**Human Atlas** by ashemag — MIT. The conversion of those meshes for the web:
millimetres and Z-up to metres and Y-up, simplification with meshoptimizer at
a 0.2% per-structure relative error bound, normals quantised to signed 16-bit,
and packing into binary chunks. The batched-rendering approach — one merged
mesh per system with per-part state in a data texture — is also adapted from
that project. Anatomyca re-chunks the output by body system so each system is
a separate download; the vertex layout is unchanged.

https://github.com/ashemag/human-atlas

## Sources this project builds on

**BodyParts3D** — CC BY 4.0, cited above:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

Cite the accompanying paper as Mitsuhashi N., Fujieda K., Tamura T., Kawamoto
S., Takagi T., Okubo K. (2009), *BodyParts3D: 3D structure database for
anatomical concepts*, Nucleic Acids Research 37(suppl_1): D782–D785. The paper
is under CC BY-NC 2.0 UK, a different licence from the data: cite it, but do
not reuse its figures.

**Open3Dmodel** — CC BY-SA 4.0. Produced by the anatomy departments of Leiden
UMC, UMC Utrecht, Maastricht, KU Leuven, Amsterdam UMC, Radboud UMC and Ghent.

**Z-Anatomy** — CC BY-SA 4.0.

**HuBMAP 3D Reference Organ Set for Female v1.5** — CC BY 4.0, Browne K. and
Schlehlein H. (2023), credited also to HuBMAP and the Visible Human Project.

**Wikidata** — CC0. Used only as a seed for Sinhala and Tamil labels and as a
coverage check, never as an authority.

## A note on the reference body

BodyParts3D is an adult male reference anatomy, segmented from the TARO MRI
volume of one young adult volunteer and refined by medical illustrators.
Proportions will not match every body; epiphysial lines are visible in the
bones because of the donor's age; and it is not a complete model of every
human structure or variation. The atlas should never be read as giving
clinical measurements.

## A note on the names

BodyParts3D supplies English names only. Sinhala and Tamil names in this
atlas come from Anatomyca's own compiled list and currently reach 35 of the
3,432 concepts. Every other structure shows its English name, and the
interface says so rather than implying a translation exists. No term is
marked reviewed without a named reviewer behind it.
