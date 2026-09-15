/**
 * Procedural anatomy: every shape in the seed layer is generated in code.
 *
 * A downloadable anatomy mesh set runs to hundreds of megabytes and carries
 * licence conditions; generating the shapes keeps the first visit small and
 * the licensing clean. The trade-off is stated honestly in the interface:
 * these are recognisable teaching shapes in correct anatomical positions,
 * not dissection-grade surfaces. They carry Grade C for exactly that reason.
 *
 * Units are metres on a body 1.75 m tall, standing, facing +Z.
 *   +X  the model's left        +Y  up        +Z  towards the viewer
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/* ── small helpers ───────────────────────────────────────────── */

function merge(list: (THREE.BufferGeometry | null | undefined)[]): THREE.BufferGeometry {
  const clean = list.filter((g): g is THREE.BufferGeometry => Boolean(g));
  if (clean.length === 1) return clean[0]!;
  const g = mergeGeometries(clean, false);
  g.computeVertexNormals();
  return g;
}

/** A capsule running from a to b. Used for bones, limbs and vessels. */
function capsule(a: THREE.Vector3, b: THREE.Vector3, rA: number, rB = rA, radial = 14): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const cyl = new THREE.CylinderGeometry(rB, rA, len, radial, 1, false);
  const capA = new THREE.SphereGeometry(rA, radial, Math.ceil(radial / 2)).translate(0, -len / 2, 0);
  const capB = new THREE.SphereGeometry(rB, radial, Math.ceil(radial / 2)).translate(0, len / 2, 0);
  const g = merge([cyl, capA, capB]);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Flatten a vertical piece front-to-back so torsos aren't cylinders. */
function flatten(g: THREE.BufferGeometry, at: number, sx = 1, sz = 0.7): THREE.BufferGeometry {
  g.translate(0, -at, 0);
  g.scale(sx, 1, sz);
  g.translate(0, at, 0);
  return g;
}

function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

function wobble(x: number, y: number, z: number, freq: number, seed: number): number {
  return (
    Math.sin(x * freq + seed) * Math.cos(y * freq * 0.8 - seed * 1.7) * Math.sin(z * freq * 1.2 + seed * 0.4) +
    0.45 * Math.sin(x * freq * 2.1 - seed * 2) * Math.cos(z * freq * 1.9 + seed)
  );
}

/**
 * A soft organic mass. Starts as a sphere, gets surface noise, is scaled
 * to an ellipsoid, then handed to `warp` for dents, notches and tapers
 * expressed in local metres.
 */
interface BlobOptions {
  at?: [number, number, number];
  scale?: [number, number, number];
  seg?: [number, number];
  amp?: number;
  freq?: number;
  seed?: number;
  warp?: ((v: THREE.Vector3) => void) | null;
}

function blob({ at = [0, 0, 0], scale = [0.05, 0.05, 0.05], seg = [40, 26], amp = 0, freq = 8, seed = 1, warp = null }: BlobOptions = {}): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  // SphereGeometry always carries a position attribute.
  const p = g.attributes['position'] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (amp) v.multiplyScalar(1 + amp * wobble(v.x, v.y, v.z, freq, seed));
    v.set(v.x * scale[0], v.y * scale[1], v.z * scale[2]);
    if (warp) warp(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.translate(at[0], at[1], at[2]);
  g.computeVertexNormals();
  return g;
}

/** A point given either as a vector or as a plain [x, y, z] triple. */
type Point3 = THREE.Vector3 | readonly [number, number, number];

const toVec = (p: Point3 | number[]): THREE.Vector3 =>
  Array.isArray(p) ? V(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0) : (p as THREE.Vector3);

/** A tube along a smooth line through the given points. */
function tube(points: readonly (Point3 | number[])[], r: number, tubular = 48, radial = 9): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(toVec));
  return new THREE.TubeGeometry(curve, tubular, r, radial, false);
}

/** Gaussian dent towards a point — hilums, eye sockets, notches. */
function dent(v: THREE.Vector3, cx: number, cy: number, cz: number, radius: number, depth: number): void {
  const dx = v.x - cx, dy = v.y - cy, dz = v.z - cz;
  const d2 = dx * dx + dy * dy + dz * dz;
  const f = Math.exp(-d2 / (radius * radius)) * depth;
  if (f > 0.0001) {
    v.x -= dx * f; v.y -= dy * f; v.z -= dz * f;
  }
}

/* ── shared landmarks ────────────────────────────────────────── */

export const SPINE_POINTS = [
  V(0, 0.88, -0.052), V(0, 1.00, -0.044), V(0, 1.10, -0.030), V(0, 1.22, -0.038),
  V(0, 1.34, -0.058), V(0, 1.45, -0.063), V(0, 1.52, -0.046), V(0, 1.59, -0.036),
];
const SPINE = new THREE.CatmullRomCurve3(SPINE_POINTS);

export const BODY = { height: 1.75, centre: V(0, 0.95, 0) };

/* ── surface ─────────────────────────────────────────────────── */

function skin() {
  const parts = [];
  parts.push(blob({ at: [0, 1.645, 0.006], scale: [0.09, 0.104, 0.098], seg: [30, 22] }));
  parts.push(capsule(V(0, 1.49, -0.012), V(0, 1.57, -0.004), 0.05, 0.048, 12));
  parts.push(flatten(capsule(V(0, 1.17, 0), V(0, 1.44, 0), 0.155, 0.158, 22), 1.3, 1, 0.66));
  parts.push(flatten(capsule(V(0, 1.03, 0), V(0, 1.18, 0), 0.14, 0.145, 22), 1.1, 1, 0.72));
  parts.push(flatten(capsule(V(0, 0.90, 0), V(0, 1.04, 0), 0.152, 0.15, 22), 0.97, 1, 0.72));
  parts.push(capsule(V(-0.15, 1.435, 0), V(0.15, 1.435, 0), 0.078, 0.078, 14));
  for (const s of [-1, 1]) {
    parts.push(capsule(V(s * 0.185, 1.42, 0), V(s * 0.215, 1.13, 0.005), 0.05, 0.038, 12));
    parts.push(capsule(V(s * 0.215, 1.13, 0.005), V(s * 0.235, 0.875, 0.01), 0.038, 0.028, 12));
    parts.push(capsule(V(s * 0.235, 0.875, 0.01), V(s * 0.243, 0.735, 0.012), 0.032, 0.022, 10));
    parts.push(capsule(V(s * 0.085, 0.94, 0), V(s * 0.10, 0.50, 0.005), 0.088, 0.055, 14));
    parts.push(capsule(V(s * 0.10, 0.50, 0.005), V(s * 0.105, 0.10, -0.005), 0.055, 0.034, 12));
    parts.push(capsule(V(s * 0.105, 0.055, -0.02), V(s * 0.105, 0.032, 0.10), 0.042, 0.028, 10));
  }
  return merge(parts);
}

/* ── skeleton ────────────────────────────────────────────────── */

function skull() {
  const cranium = blob({
    at: [0, 1.648, 0.004], scale: [0.086, 0.10, 0.10], seg: [44, 30], amp: 0.012, freq: 6, seed: 3,
    warp: (v) => {
      dent(v, 0.036, 0.004, 0.082, 0.032, 0.55);   // right orbit
      dent(v, -0.036, 0.004, 0.082, 0.032, 0.55);  // left orbit
      dent(v, 0, -0.055, 0.078, 0.03, 0.3);        // nasal notch
      dent(v, 0, -0.09, -0.02, 0.05, 0.25);        // base
      if (v.y < -0.058) v.y = -0.058 + (v.y + 0.058) * 0.35;
    },
  });
  const maxilla = flatten(capsule(V(-0.032, 1.585, 0.052), V(0.032, 1.585, 0.052), 0.022, 0.022, 12), 1.585, 1, 0.9);
  const nose = blob({ at: [0, 1.60, 0.088], scale: [0.012, 0.022, 0.014], seg: [16, 12] });
  return merge([cranium, maxilla, nose]);
}

function mandible() {
  const arch = tube(
    [[-0.052, 1.575, -0.03], [-0.045, 1.556, 0.03], [0, 1.548, 0.062], [0.045, 1.556, 0.03], [0.052, 1.575, -0.03]],
    0.011, 40, 8,
  );
  const rami = [-1, 1].map((s) => capsule(V(s * 0.052, 1.575, -0.03), V(s * 0.058, 1.625, -0.042), 0.011, 0.008, 10));
  return merge([arch, ...rami]);
}

function spine() {
  const parts = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const p = SPINE.getPoint(0.06 + t * 0.94);
    const r = 0.021 - t * 0.006;
    const body = flatten(new THREE.CylinderGeometry(r, r, 0.021, 14).translate(p.x, p.y, p.z), p.y, 1, 0.82);
    const spinous = capsule(V(p.x, p.y, p.z - 0.004), V(p.x, p.y - 0.014, p.z - 0.032 - r * 0.2), 0.007, 0.005, 8);
    parts.push(body, spinous);
  }
  parts.push(flatten(capsule(V(0, 0.855, -0.05), V(0, 0.925, -0.052), 0.026, 0.034, 14), 0.89, 1, 0.7));
  return merge(parts);
}

function ribcage() {
  const parts = [];
  for (let i = 0; i < 12; i++) {
    const y = 1.455 - i * 0.0235;
    const f = Math.sin((Math.PI * (i + 1.2)) / 14.2);
    const back = SPINE.getPoint(THREE.MathUtils.clamp((y - 0.88) / 0.71, 0, 1)).z;
    for (const s of [-1, 1]) {
      const pts = [
        V(s * 0.013, y, back + 0.004),
        V(s * (0.05 + 0.035 * f), y - 0.006, -0.085 - 0.01 * f),
        V(s * (0.078 + 0.05 * f), y - 0.022, -0.01),
        V(s * (0.07 + 0.045 * f), y - 0.045, 0.055 + 0.015 * f),
      ];
      if (i < 10) pts.push(V(s * (0.026 + 0.012 * f), y - 0.062, 0.082));
      parts.push(tube(pts, 0.0072, i < 10 ? 30 : 22, 6));
    }
  }
  return merge(parts);
}

function sternum() {
  const body = flatten(capsule(V(0, 1.30, 0.085), V(0, 1.435, 0.079), 0.02, 0.026, 12), 1.37, 1, 0.34);
  const xiphoid = flatten(capsule(V(0, 1.268, 0.086), V(0, 1.30, 0.085), 0.011, 0.018, 10), 1.28, 1, 0.34);
  return merge([body, xiphoid]);
}

function clavicle() {
  return merge([-1, 1].map((s) =>
    tube([[s * 0.016, 1.452, 0.062], [s * 0.075, 1.468, 0.05], [s * 0.13, 1.458, 0.018], [s * 0.163, 1.445, 0.0]], 0.011, 24, 8),
  ));
}

function scapula() {
  const parts = [];
  for (const s of [-1, 1]) {
    const blade = blob({
      at: [s * 0.11, 1.355, -0.055], scale: [0.058, 0.072, 0.02], seg: [24, 18],
      warp: (v) => { v.z -= v.y * 0.25; if (v.y < -0.02) { v.x *= 1 - (Math.abs(v.y) - 0.02) * 6; } },
    });
    const ridge = capsule(V(s * 0.06, 1.40, -0.062), V(s * 0.155, 1.425, -0.035), 0.009, 0.013, 10);
    const socket = blob({ at: [s * 0.163, 1.418, -0.012], scale: [0.018, 0.02, 0.018], seg: [16, 12] });
    parts.push(blade, ridge, socket);
  }
  return merge(parts);
}

function humerus() {
  return merge([-1, 1].flatMap((s) => [
    blob({ at: [s * 0.172, 1.425, -0.006], scale: [0.026, 0.026, 0.026], seg: [18, 14] }),
    capsule(V(s * 0.178, 1.412, -0.004), V(s * 0.205, 1.135, 0.004), 0.019, 0.016, 14),
    blob({ at: [s * 0.207, 1.122, 0.004], scale: [0.024, 0.018, 0.02], seg: [18, 14] }),
  ]));
}

function forearm() {
  return merge([-1, 1].flatMap((s) => [
    capsule(V(s * 0.192, 1.122, 0.014), V(s * 0.224, 0.878, 0.012), 0.012, 0.014, 12),
    capsule(V(s * 0.216, 1.128, -0.012), V(s * 0.231, 0.882, -0.006), 0.014, 0.010, 12),
  ]));
}

function hand() {
  const parts = [];
  for (const s of [-1, 1]) {
    const wrist = V(s * 0.230, 0.868, 0.004);
    parts.push(blob({ at: [wrist.x, wrist.y, wrist.z], scale: [0.016, 0.012, 0.016], seg: [16, 12] }));
    for (let f = 0; f < 4; f++) {
      const spread = (f - 1.5) * 0.012;
      const knuckle = V(wrist.x + s * 0.004 + spread * 0.4, 0.822, 0.006 + spread * 0.3);
      const tipY = 0.775 - Math.sin((f + 1) / 5 * Math.PI) * 0.012;
      parts.push(capsule(wrist, knuckle, 0.006, 0.005, 7));
      parts.push(capsule(knuckle, V(knuckle.x + spread * 0.3, tipY, knuckle.z + 0.004), 0.005, 0.0035, 7));
    }
    const thumbBase = V(wrist.x - s * 0.014, 0.848, 0.022);
    parts.push(capsule(wrist, thumbBase, 0.006, 0.005, 7));
    parts.push(capsule(thumbBase, V(wrist.x - s * 0.024, 0.818, 0.034), 0.005, 0.004, 7));
  }
  return merge(parts);
}

function pelvis() {
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(blob({
      at: [s * 0.082, 0.995, -0.012], scale: [0.03, 0.062, 0.058], seg: [24, 18],
      warp: (v) => { v.x += v.z * 0.35 * s; v.x += v.y * 0.25 * s; },
    }));
    parts.push(capsule(V(s * 0.088, 0.952, -0.005), V(s * 0.072, 0.882, 0.004), 0.022, 0.017, 12));
    parts.push(tube([[s * 0.068, 0.878, 0.008], [s * 0.045, 0.882, 0.042], [0, 0.893, 0.055]], 0.012, 18, 8));
  }
  return merge(parts);
}

function femur() {
  return merge([-1, 1].flatMap((s) => [
    blob({ at: [s * 0.062, 0.928, -0.004], scale: [0.026, 0.026, 0.026], seg: [18, 14] }),
    capsule(V(s * 0.066, 0.924, -0.004), V(s * 0.088, 0.888, 0), 0.016, 0.019, 12),
    capsule(V(s * 0.088, 0.888, 0), V(s * 0.098, 0.492, 0.002), 0.021, 0.019, 14),
    blob({ at: [s * 0.099, 0.478, 0.002], scale: [0.03, 0.022, 0.028], seg: [18, 14] }),
  ]));
}

function lowerleg() {
  return merge([-1, 1].flatMap((s) => [
    blob({ at: [s * 0.096, 0.462, 0.002], scale: [0.028, 0.018, 0.026], seg: [18, 14] }),
    capsule(V(s * 0.096, 0.455, 0.002), V(s * 0.099, 0.10, -0.002), 0.019, 0.016, 12),
    capsule(V(s * 0.118, 0.452, -0.004), V(s * 0.114, 0.105, -0.004), 0.009, 0.008, 9),
  ]));
}

function foot() {
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(blob({ at: [s * 0.10, 0.045, -0.032], scale: [0.026, 0.028, 0.032], seg: [18, 14] }));
    parts.push(capsule(V(s * 0.10, 0.046, -0.02), V(s * 0.10, 0.038, 0.028), 0.022, 0.018, 10));
    for (let i = 0; i < 5; i++) {
      const x = s * (0.082 + i * 0.012);
      parts.push(capsule(V(s * 0.10, 0.036, 0.03), V(x, 0.026, 0.088), 0.007, 0.005, 7));
      parts.push(capsule(V(x, 0.026, 0.088), V(x, 0.022, 0.112 - i * 0.004), 0.005, 0.0035, 6));
    }
  }
  return merge(parts);
}

/* ── nervous ─────────────────────────────────────────────────── */

function brain() {
  return blob({
    at: [0, 1.658, 0.004], scale: [0.072, 0.066, 0.086], seg: [72, 48], amp: 0.055, freq: 26, seed: 7,
    warp: (v) => {
      if (Math.abs(v.x) < 0.012) v.y -= (0.012 - Math.abs(v.x)) * 0.35;   // longitudinal fissure
      if (v.y < -0.028) v.y = -0.028 + (v.y + 0.028) * 0.3;               // flat underside
      if (v.z < -0.03) v.y -= (Math.abs(v.z) - 0.03) * 0.25;              // occipital slope
    },
  });
}

function cerebellum() {
  return blob({
    at: [0, 1.598, -0.055], scale: [0.044, 0.026, 0.032], seg: [48, 32], amp: 0.07, freq: 55, seed: 11,
    warp: (v) => { if (Math.abs(v.x) < 0.006) v.z += 0.004; },
  });
}

function spinalCord() {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = 0.42 + (i / 14) * 0.58;
    const p = SPINE.getPoint(t);
    pts.push(V(p.x, p.y, p.z + 0.011));
  }
  pts.push(V(0, 1.615, -0.028));
  const cord = tube(pts, 0.009, 60, 8);
  const roots = [];
  const tail = SPINE.getPoint(0.42);
  for (let i = 0; i < 5; i++) {
    roots.push(capsule(
      V(tail.x, tail.y, tail.z + 0.011),
      V((i - 2) * 0.007, 0.945 - Math.abs(i - 2) * 0.012, tail.z + 0.004),
      0.003, 0.002, 6,
    ));
  }
  return merge([cord, ...roots]);
}

function sciatic() {
  return merge([-1, 1].flatMap((s) => [
    tube([[s * 0.03, 0.99, -0.03], [s * 0.062, 0.93, -0.038], [s * 0.078, 0.78, -0.03], [s * 0.088, 0.55, -0.022]], 0.008, 34, 7),
    tube([[s * 0.088, 0.55, -0.022], [s * 0.086, 0.40, -0.014], [s * 0.09, 0.18, -0.01], [s * 0.095, 0.075, 0.0]], 0.005, 26, 6),
  ]));
}

/* ── heart & vessels ─────────────────────────────────────────── */

function heart() {
  const ventricles = capsule(V(-0.004, 1.352, 0.026), V(0.042, 1.262, 0.062), 0.05, 0.012, 22);
  const rv = blob({ at: [-0.012, 1.315, 0.056], scale: [0.032, 0.042, 0.03], seg: [22, 16] });
  const la = blob({ at: [0.006, 1.362, 0.012], scale: [0.028, 0.024, 0.026], seg: [22, 16] });
  const ra = blob({ at: [-0.032, 1.348, 0.042], scale: [0.026, 0.026, 0.024], seg: [22, 16] });
  return merge([ventricles, rv, la, ra]);
}

function aorta() {
  const arch = tube(
    [[0.004, 1.335, 0.032], [0.012, 1.395, 0.014], [0.0, 1.412, -0.012], [-0.012, 1.375, -0.034],
     [-0.008, 1.26, -0.046], [0.0, 1.10, -0.040], [0.0, 0.975, -0.036]],
    0.014, 60, 10,
  );
  const iliacs = [-1, 1].map((s) => tube([[0, 0.978, -0.036], [s * 0.03, 0.945, -0.028], [s * 0.052, 0.912, -0.014]], 0.009, 18, 8));
  return merge([arch, ...iliacs]);
}

function venaCava() {
  const inferior = tube([[-0.026, 1.34, 0.03], [-0.032, 1.22, 0.0], [-0.03, 1.08, -0.022], [-0.028, 0.95, -0.026]], 0.013, 40, 9);
  const superior = tube([[-0.026, 1.34, 0.03], [-0.03, 1.40, 0.022], [-0.032, 1.46, 0.012]], 0.012, 18, 8);
  return merge([inferior, superior]);
}

function pulmonary() {
  const trunk = tube([[0.012, 1.352, 0.05], [0.006, 1.392, 0.03], [-0.004, 1.396, 0.012]], 0.013, 18, 8);
  const branches = [-1, 1].map((s) => tube([[-0.004, 1.394, 0.012], [s * 0.03, 1.375, 0.006], [s * 0.052, 1.345, 0.0]], 0.009, 18, 7));
  const veins = [-1, 1].flatMap((s) => [
    tube([[0.004, 1.352, 0.016], [s * 0.032, 1.33, 0.004], [s * 0.056, 1.318, 0.0]], 0.007, 16, 6),
  ]);
  return merge([trunk, ...branches, ...veins]);
}

function carotids() {
  return merge([-1, 1].flatMap((s) => [
    tube([[s * 0.014, 1.432, 0.008], [s * 0.026, 1.49, 0.014], [s * 0.032, 1.545, 0.012], [s * 0.03, 1.60, 0.006]], 0.008, 26, 7),
    tube([[s * 0.03, 1.545, 0.012], [s * 0.042, 1.57, 0.03]], 0.005, 10, 6),
  ]));
}

/* ── breathing ───────────────────────────────────────────────── */

function trachea() {
  const pipe = tube([[0, 1.585, 0.028], [0, 1.52, 0.024], [0, 1.44, 0.014]], 0.014, 22, 10);
  const rings = [];
  for (let i = 0; i < 9; i++) {
    const y = 1.575 - i * 0.016;
    const z = 0.028 - (1.585 - y) * 0.1;
    rings.push(new THREE.TorusGeometry(0.0155, 0.0028, 6, 18).rotateX(Math.PI / 2).translate(0, y, z));
  }
  return merge([pipe, ...rings]);
}

function bronchi() {
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(tube([[0, 1.442, 0.014], [s * 0.022, 1.412, 0.01], [s * 0.042, 1.392, 0.006]], 0.010, 18, 8));
    parts.push(tube([[s * 0.042, 1.392, 0.006], [s * 0.056, 1.352, 0.012], [s * 0.062, 1.312, 0.016]], 0.007, 16, 7));
    parts.push(tube([[s * 0.042, 1.392, 0.006], [s * 0.062, 1.372, -0.006], [s * 0.078, 1.342, -0.014]], 0.006, 16, 7));
    parts.push(tube([[s * 0.062, 1.312, 0.016], [s * 0.07, 1.272, 0.014], [s * 0.074, 1.24, 0.006]], 0.0045, 14, 6));
  }
  return merge(parts);
}

function lungs() {
  const shape = (s: number) => (v: THREE.Vector3): void => {
    const t = (v.y + 0.112) / 0.224;                     // 0 base → 1 apex
    const taper = 0.55 + 0.45 * Math.sin(Math.min(1, t) * Math.PI * 0.85);
    v.x *= taper; v.z *= taper;
    if (v.y < -0.08) v.y = -0.08 + (v.y + 0.08) * 0.45;  // flat base on the diaphragm
    dent(v, -s * 0.03, 0.012, -0.004, 0.045, 0.5);       // hilum, facing the midline
    if (s > 0) dent(v, 0.0, -0.03, 0.055, 0.05, 0.45);   // cardiac notch, left lung only
  };
  return merge([
    blob({ at: [-0.078, 1.305, 0.004], scale: [0.058, 0.112, 0.072], seg: [40, 30], warp: shape(-1) }),
    blob({ at: [0.076, 1.305, 0.004], scale: [0.052, 0.112, 0.07], seg: [40, 30], warp: shape(1) }),
  ]);
}

function diaphragm() {
  const dome = new THREE.SphereGeometry(1, 44, 20, 0, Math.PI * 2, 0, Math.PI * 0.46);
  dome.scale(0.142, 0.08, 0.098);
  dome.translate(0, 1.155, -0.004);
  const skirt = new THREE.CylinderGeometry(0.142, 0.138, 0.03, 44, 1, true);
  skirt.scale(1, 1, 0.69);
  skirt.translate(0, 1.14, -0.004);
  dome.scale(1, 1, 0.69);
  return merge([dome, skirt]);
}

/* ── digestion ───────────────────────────────────────────────── */

function oesophagus() {
  return tube([[0, 1.565, -0.006], [0, 1.44, -0.022], [0, 1.30, -0.03], [0.006, 1.20, -0.016], [0.016, 1.168, -0.004]], 0.011, 44, 9);
}

function stomach() {
  const body = tube(
    [[0.016, 1.168, -0.004], [0.046, 1.146, 0.008], [0.062, 1.106, 0.016], [0.042, 1.068, 0.022],
     [0.004, 1.062, 0.012], [-0.022, 1.086, -0.004]],
    0.031, 44, 12,
  );
  const fundus = blob({ at: [0.05, 1.152, 0.002], scale: [0.042, 0.04, 0.038], seg: [26, 20] });
  return merge([body, fundus]);
}

function liver() {
  return blob({
    at: [-0.042, 1.168, 0.016], scale: [0.098, 0.05, 0.062], seg: [44, 30],
    warp: (v) => {
      if (v.x > 0) { v.y *= 1 - Math.min(0.55, v.x * 5.5); v.z *= 1 - Math.min(0.3, v.x * 3); }
      if (v.y < -0.012) v.y = -0.012 + (v.y + 0.012) * 0.6;
      v.y -= v.z * 0.18;
      dent(v, 0.01, -0.03, 0.03, 0.03, 0.4);
    },
  });
}

function gallbladder() {
  return blob({
    at: [-0.03, 1.132, 0.052], scale: [0.016, 0.024, 0.016], seg: [22, 16],
    warp: (v) => { if (v.y > 0) { v.x *= 1 - v.y * 12; v.z *= 1 - v.y * 12; } },
  });
}

function pancreas() {
  const tail = tube([[0.062, 1.126, -0.022], [0.03, 1.118, -0.028], [-0.004, 1.104, -0.022]], 0.014, 26, 9);
  const head = blob({ at: [-0.024, 1.094, -0.014], scale: [0.022, 0.02, 0.018], seg: [20, 16] });
  return merge([tail, head]);
}

function smallIntestine() {
  const pts = [];
  const N = 84;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = t * Math.PI * 2 * 5.5;
    const rad = 0.052 + 0.016 * Math.sin(t * Math.PI * 3) + 0.004 * hash(i * 3.1);
    pts.push(V(Math.cos(ang) * rad, 1.088 - t * 0.115 + 0.006 * Math.sin(ang * 2), 0.014 + Math.sin(ang) * rad * 0.52));
  }
  return tube(pts, 0.0155, 300, 8);
}

function largeIntestine() {
  const pts = [
    [-0.082, 0.955, 0.016], [-0.094, 1.03, 0.014], [-0.09, 1.12, 0.008], [-0.072, 1.155, 0.002],
    [-0.02, 1.142, 0.026], [0.04, 1.15, 0.022], [0.082, 1.152, -0.002], [0.094, 1.08, -0.01],
    [0.086, 1.0, -0.018], [0.04, 0.952, -0.022], [0.006, 0.935, -0.03], [0.0, 0.888, -0.03],
  ];
  const colon = tube(pts, 0.024, 90, 10);
  const caecum = blob({ at: [-0.082, 0.942, 0.018], scale: [0.026, 0.024, 0.024], seg: [20, 16] });
  const appendix = tube([[-0.082, 0.928, 0.024], [-0.07, 0.912, 0.03], [-0.056, 0.905, 0.026]], 0.005, 14, 6);
  return merge([colon, caecum, appendix]);
}

/* ── urinary ─────────────────────────────────────────────────── */

function kidneys() {
  return merge([-1, 1].map((s) =>
    blob({
      at: [s * 0.056, 1.118, -0.046], scale: [0.026, 0.052, 0.03], seg: [28, 22],
      warp: (v) => { dent(v, -s * 0.026, 0, 0.004, 0.028, 0.75); },
    }),
  ));
}

function ureters() {
  return merge([-1, 1].map((s) =>
    tube([[s * 0.05, 1.09, -0.044], [s * 0.046, 1.02, -0.03], [s * 0.03, 0.955, -0.014], [s * 0.012, 0.928, 0.006]], 0.005, 30, 7),
  ));
}

function bladder() {
  return blob({
    at: [0, 0.912, 0.018], scale: [0.034, 0.03, 0.03], seg: [26, 20],
    warp: (v) => { if (v.y < -0.012) v.y = -0.012 + (v.y + 0.012) * 0.7; },
  });
}

/* ── glands ──────────────────────────────────────────────────── */

function thyroid() {
  const lobes = [-1, 1].map((s) =>
    blob({
      at: [s * 0.021, 1.498, 0.03], scale: [0.014, 0.026, 0.013], seg: [20, 16],
      warp: (v) => { v.x += v.y * 0.25 * s; },
    }),
  );
  const isthmus = capsule(V(-0.016, 1.492, 0.032), V(0.016, 1.492, 0.032), 0.007, 0.007, 10);
  return merge([...lobes, isthmus]);
}

function adrenals() {
  return merge([-1, 1].map((s) =>
    blob({
      at: [s * 0.052, 1.158, -0.046], scale: [0.02, 0.011, 0.02], seg: [20, 14],
      warp: (v) => { if (v.y < 0) v.y *= 0.6; },
    }),
  ));
}

/* ── lymphatic ───────────────────────────────────────────────── */

function spleen() {
  return blob({
    at: [0.088, 1.198, -0.024], scale: [0.03, 0.044, 0.026], seg: [26, 20],
    warp: (v) => { dent(v, -0.026, 0, 0.004, 0.03, 0.5); v.y -= v.x * 0.25; },
  });
}

/* ── registry ────────────────────────────────────────────────── */

export const BUILDERS = {
  skin, skull, mandible, spine, ribcage, sternum, clavicle, scapula, humerus, forearm, hand,
  pelvis, femur, lowerleg, foot, brain, cerebellum, spinalCord, sciatic, heart, aorta, venaCava,
  pulmonary, carotids, trachea, bronchi, lungs, diaphragm, oesophagus, stomach, liver, gallbladder,
  pancreas, smallIntestine, largeIntestine, kidneys, ureters, bladder, thyroid, adrenals, spleen,
};

/** Parts drawn from both sides, so they need double-sided shading. */
export const TWO_SIDED = new Set(['diaphragm']);

/** Builder keys the seed structures may reference. */
export type BuilderKey = keyof typeof BUILDERS;

export function hasBuilder(key: string): key is BuilderKey {
  return Object.hasOwn(BUILDERS, key);
}
