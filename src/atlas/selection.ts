import type { Bp3dConcept, Bp3dManifest, Bp3dPart } from './manifest';

/**
 * Resolving what a reader selected.
 *
 * Only atomic structures (ELEMENTs, ids like `FJ1252`) have meshes. Almost
 * every term a student actually looks for — heart, liver, kidney — is a
 * COMPOUND concept (ids like `FMA7088`) defined as a sum of elements and
 * carrying no geometry of its own. The heart alone gathers 83 element meshes.
 *
 * So tapping the body yields an element, while searching usually yields a
 * concept, and both have to highlight the right thing. This module is the one
 * place that knows how to go between them.
 */

export type SelectionKind = 'concept' | 'element';

export interface Selection {
  readonly kind: SelectionKind;
  readonly id: string;
  readonly name: string;
  /** Element mesh ids to highlight. One for an element, many for a concept. */
  readonly elements: readonly string[];
  readonly system: string;
}

/** Concept ids are FMA-prefixed; element ids are not. */
export function isConceptId(id: string): boolean {
  return id.startsWith('FMA');
}

export interface AtlasIndex {
  readonly parts: ReadonlyMap<string, Bp3dPart>;
  readonly concepts: ReadonlyMap<string, Bp3dConcept>;
  /** Element id -> the concepts that contain it, innermost first. */
  readonly conceptsOfElement: ReadonlyMap<string, readonly string[]>;
}

export function buildIndex(manifest: Bp3dManifest): AtlasIndex {
  const parts = new Map(manifest.parts.map((p) => [p.id, p]));
  const concepts = new Map(manifest.concepts.map((c) => [c.id, c]));

  const conceptsOfElement = new Map<string, string[]>();
  for (const concept of manifest.concepts) {
    for (const element of concept.elements) {
      const list = conceptsOfElement.get(element);
      if (list) list.push(concept.id);
      else conceptsOfElement.set(element, [concept.id]);
    }
  }
  // Smaller concepts are more specific, so they read better as a breadcrumb.
  for (const list of conceptsOfElement.values()) {
    list.sort((a, b) =>
      (concepts.get(a)?.elements.length ?? 0) - (concepts.get(b)?.elements.length ?? 0));
  }

  return { parts, concepts, conceptsOfElement };
}

export function resolve(index: AtlasIndex, id: string): Selection | null {
  if (isConceptId(id)) {
    const concept = index.concepts.get(id);
    if (!concept) return null;
    // A concept spans whichever systems its elements belong to. Weigh them by
    // triangle count rather than by how many meshes each contributes: the
    // heart is built from more coronary vessel meshes than chamber meshes,
    // but it is plainly cardiac, and the chambers are the bulk of it.
    const tally = new Map<string, number>();
    for (const element of concept.elements) {
      const part = index.parts.get(element);
      if (!part) continue;
      tally.set(part.system, (tally.get(part.system) ?? 0) + part.indexCount);
    }
    const system = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'skeletal';
    return {
      kind: 'concept',
      id,
      name: concept.name,
      elements: concept.elements.filter((e) => index.parts.has(e)),
      system,
    };
  }

  const part = index.parts.get(id);
  if (!part) return null;
  return { kind: 'element', id, name: part.name, elements: [id], system: part.system };
}

/** Which concepts contain this element, most specific first. */
export function breadcrumbFor(index: AtlasIndex, elementId: string): readonly Bp3dConcept[] {
  return (index.conceptsOfElement.get(elementId) ?? [])
    .map((id) => index.concepts.get(id))
    .filter((c): c is Bp3dConcept => Boolean(c));
}

/** Every system a selection touches, so they can all be switched on. */
export function systemsOf(index: AtlasIndex, selection: Selection): readonly string[] {
  const systems = new Set<string>();
  for (const element of selection.elements) {
    const system = index.parts.get(element)?.system;
    if (system) systems.add(system);
  }
  return [...systems];
}
