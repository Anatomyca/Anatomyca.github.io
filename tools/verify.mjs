import { BUILDERS } from '../src/geometry.js';
import { PARTS } from '../src/data.js';
import { SYSTEM_BY_ID } from '../src/config.js';
let tris = 0, bad = [];
for (const p of PARTS) {
  const fn = BUILDERS[p.build];
  if (!fn) { bad.push(`${p.id}: no builder "${p.build}"`); continue; }
  if (!SYSTEM_BY_ID[p.sys]) bad.push(`${p.id}: unknown system ${p.sys}`);
  let g;
  try { g = fn(); } catch (e) { bad.push(`${p.id}: threw ${e.message}`); continue; }
  const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
  tris += n;
  g.computeBoundingBox();
  const b = g.boundingBox;
  const h = [b.min.y.toFixed(2), b.max.y.toFixed(2)].join('→');
  const w = (b.max.x - b.min.x).toFixed(2);
  console.log(`${p.id.padEnd(17)} ${String(Math.round(n)).padStart(6)} tris   y ${h}   w ${w}`);
  if (!isFinite(b.min.y) || b.max.y > 1.79 || b.min.y < -0.02) bad.push(`${p.id}: out of body bounds ${h}`);
  for (const nid of p.near || []) if (!PARTS.some(q => q.id === nid)) bad.push(`${p.id}: near→${nid} missing`);
}
console.log('\ntotal triangles:', Math.round(tris));
console.log(bad.length ? 'PROBLEMS:\n' + bad.join('\n') : 'all parts built cleanly');
