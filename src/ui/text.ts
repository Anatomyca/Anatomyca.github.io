/**
 * BodyParts3D names arrive in two registers: element meshes are capitalised
 * ("Left kidney"), concepts are not ("left kidney"). Presenting both as
 * sentence case makes the interface read consistently without altering the
 * name itself.
 */
export function sentenceCase(name: string): string {
  if (!name) return name;
  // Leave anything already capitalised or acronym-like alone.
  if (name[0] !== name[0]!.toLowerCase()) return name;
  return name[0]!.toUpperCase() + name.slice(1);
}
