import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * Readers for the six BodyParts3D text tables.
 *
 * All six are tab-separated with no header row. Their columns follow
 * README_e.html. Blank and comment lines are skipped, because the published
 * files contain both in places.
 */

async function* rows(path) {
  const input = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    yield trimmed.split('\t');
  }
}

/**
 * isa_parts_list_e.txt / partof_parts_list_e.txt
 *   FMA concept ID, representation (file) ID, English name
 */
export async function readPartsList(path) {
  const out = [];
  for await (const cols of rows(path)) {
    const [conceptId, fileId, name] = cols;
    if (!conceptId || !name) continue;
    out.push({ conceptId, fileId: fileId ?? '', name });
  }
  return out;
}

/**
 * isa_inclusion_relation_list.txt / partof_inclusion_relation_list.txt
 *   parent concept ID, child concept ID
 */
export async function readRelations(path) {
  const out = [];
  for await (const cols of rows(path)) {
    const [parent, child] = cols;
    if (!parent || !child) continue;
    out.push({ parent, child });
  }
  return out;
}

/**
 * isa_element_parts.txt / partof_element_parts.txt
 *   compound concept ID, then the element file IDs it is made of
 */
export async function readElementParts(path) {
  const out = new Map();
  for await (const cols of rows(path)) {
    const [conceptId, ...elements] = cols;
    if (!conceptId) continue;
    const list = elements.filter(Boolean);
    if (list.length === 0) continue;
    out.set(conceptId, list);
  }
  return out;
}

/** Turn flat parent/child pairs into adjacency maps in both directions. */
export function buildTree(relations) {
  const children = new Map();
  const parents = new Map();
  for (const { parent, child } of relations) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
    if (!parents.has(child)) parents.set(child, []);
    parents.get(child).push(parent);
  }
  return { children, parents };
}

/** Walk up a tree to the root, for breadcrumbs. Cycle-safe. */
export function ancestorsOf(id, parents, limit = 32) {
  const chain = [];
  const seen = new Set([id]);
  let current = id;
  while (chain.length < limit) {
    const next = parents.get(current)?.[0];
    if (!next || seen.has(next)) break;
    chain.push(next);
    seen.add(next);
    current = next;
  }
  return chain;
}
