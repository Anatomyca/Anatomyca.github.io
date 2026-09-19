import * as THREE from 'three';
import type { Bp3dManifest, Bp3dPart } from './manifest';
import { loadChunk } from './manifest';
import { BP3D_SYSTEM_BY_ID } from './systems';

/**
 * Batched rendering for the full BodyParts3D body.
 *
 * 2,234 individual meshes would mean 2,234 draw calls, which no phone will
 * sustain. Instead all the parts of one system are merged into a single
 * geometry carrying a per-vertex `partIndex`, so a system costs one draw
 * call. Visibility, selection and hover are then driven by a small data
 * texture the shader samples per fragment — changing what is shown never
 * touches the geometry, so it costs nothing.
 *
 * The approach follows the upstream Human Atlas project (MIT), credited in
 * ATTRIBUTION.md.
 */

/** Per-part state, packed into one RGBA texel: [visible, emphasis, _, _]. */
const CHANNELS = 4;

export interface SystemBatch {
  readonly system: string;
  readonly mesh: THREE.Mesh;
  /**
   * A second pass over the same geometry that draws only the selected parts,
   * with depth testing off, so the selection is visible through whatever
   * encloses it. Without it, selecting the brain shows an opaque skull:
   * one material per batch cannot depth-sort a selection against its own
   * surroundings, however faint those surroundings are made.
   */
  readonly highlight: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  readonly highlightMaterial: THREE.MeshStandardMaterial;
  readonly parts: readonly Bp3dPart[];
  /** part id -> row in the state texture */
  readonly index: ReadonlyMap<string, number>;
  readonly state: Float32Array;
  readonly texture: THREE.DataTexture;
}

function buildGeometry(parts: readonly Bp3dPart[], buffer: ArrayBuffer): THREE.BufferGeometry {
  let vertexTotal = 0;
  let indexTotal = 0;
  for (const part of parts) {
    vertexTotal += part.vertexCount;
    indexTotal += part.indexCount;
  }

  const positions = new Float32Array(vertexTotal * 3);
  const normals = new Int16Array(vertexTotal * 3);
  const indices = new Uint32Array(indexTotal);
  const partIndex = new Float32Array(vertexTotal);

  let vertexAt = 0;
  let indexAt = 0;
  parts.forEach((part, i) => {
    positions.set(new Float32Array(buffer, part.positions, part.vertexCount * 3), vertexAt * 3);
    normals.set(new Int16Array(buffer, part.normals, part.vertexCount * 3), vertexAt * 3);

    // Indices are per-part, so they shift by where this part landed.
    const source = new Uint32Array(buffer, part.indices, part.indexCount);
    for (let k = 0; k < source.length; k++) indices[indexAt + k] = source[k]! + vertexAt;

    partIndex.fill(i, vertexAt, vertexAt + part.vertexCount);
    vertexAt += part.vertexCount;
    indexAt += part.indexCount;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // Normals were quantised to signed 16-bit upstream, so they read normalised.
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3, true));
  geometry.setAttribute('partIndex', new THREE.BufferAttribute(partIndex, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Teach a standard material to read per-part state.
 *
 * Hiding a part by discarding its fragments keeps one draw call per system
 * however many parts are switched off, which is the whole point of batching.
 */
function attachPartState(
  material: THREE.MeshStandardMaterial,
  texture: THREE.DataTexture,
  width: number,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['partState'] = { value: texture };
    shader.uniforms['partStateWidth'] = { value: width };
    shader.uniforms['selectColour'] = { value: new THREE.Color('#c8504a') };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float partIndex;
        varying float vPartIndex;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPartIndex = partIndex;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D partState;
        uniform float partStateWidth;
        uniform vec3 selectColour;
        varying float vPartIndex;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec2 stateUv = vec2((vPartIndex + 0.5) / partStateWidth, 0.5);
        vec4 state = texture2D(partState, stateUv);
        if (state.r < 0.5) discard;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, selectColour, state.g * 0.65);
        gl_FragColor.a *= state.b;`);
  };
  material.needsUpdate = true;
}

export async function buildSystemBatch(
  manifest: Bp3dManifest,
  system: string,
): Promise<SystemBatch | null> {
  const chunk = manifest.chunks.find((c) => (c as { system?: string }).system === system);
  const parts = manifest.parts.filter((p) => p.system === system);
  if (!chunk || parts.length === 0) return null;

  const buffer = await loadChunk(chunk);
  const geometry = buildGeometry(parts, buffer);

  const width = THREE.MathUtils.ceilPowerOfTwo(Math.max(parts.length, 2));
  const state = new Float32Array(width * CHANNELS);
  // Start every part visible and fully opaque, with no emphasis.
  for (let i = 0; i < parts.length; i++) {
    state[i * CHANNELS] = 1;
    state[i * CHANNELS + 2] = 1;
  }
  const texture = new THREE.DataTexture(state, width, 1, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;

  const definition = BP3D_SYSTEM_BY_ID.get(system);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(definition?.colour ?? '#d8cfc0'),
    roughness: system === 'skeletal' ? 0.62 : 0.45,
    metalness: 0,
    transparent: true,
    side: THREE.DoubleSide,
  });
  attachPartState(material, texture, width);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = system;
  mesh.frustumCulled = false;

  // The highlight pass shares the geometry — no extra memory — and keeps only
  // the fragments whose emphasis channel is set.
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(definition?.colour ?? '#d8cfc0'),
    emissive: new THREE.Color('#c8504a'),
    emissiveIntensity: 0.28,
    roughness: 0.5,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  attachHighlightState(highlightMaterial, texture, width);

  const highlight = new THREE.Mesh(geometry, highlightMaterial);
  highlight.name = `${system}:highlight`;
  highlight.frustumCulled = false;
  highlight.visible = false;     // only shown while something is selected
  highlight.raycast = () => {};  // never pickable: the base mesh handles that

  return {
    system,
    mesh,
    highlight,
    material,
    highlightMaterial,
    parts,
    index: new Map(parts.map((p, i) => [p.id, i])),
    state,
    texture,
  };
}

/** Set one part's visibility, emphasis and opacity, then flag the texture. */
export function setPartState(
  batch: SystemBatch,
  partId: string,
  next: { visible?: boolean; emphasis?: number; opacity?: number },
): void {
  const row = batch.index.get(partId);
  if (row === undefined) return;
  const at = row * CHANNELS;
  if (next.visible !== undefined) batch.state[at] = next.visible ? 1 : 0;
  if (next.emphasis !== undefined) batch.state[at + 1] = next.emphasis;
  if (next.opacity !== undefined) batch.state[at + 2] = next.opacity;
  batch.texture.needsUpdate = true;
}

export function setAllPartState(
  batch: SystemBatch,
  next: { visible?: boolean; emphasis?: number; opacity?: number },
): void {
  for (let i = 0; i < batch.parts.length; i++) {
    const at = i * CHANNELS;
    if (next.visible !== undefined) batch.state[at] = next.visible ? 1 : 0;
    if (next.emphasis !== undefined) batch.state[at + 1] = next.emphasis;
    if (next.opacity !== undefined) batch.state[at + 2] = next.opacity;
  }
  batch.texture.needsUpdate = true;
}

/** Which part a raycast hit, resolved through the per-vertex partIndex. */
export function partAtIntersection(
  batch: SystemBatch,
  intersection: THREE.Intersection,
): Bp3dPart | null {
  const face = intersection.face;
  if (!face) return null;
  const attribute = batch.mesh.geometry.getAttribute('partIndex');
  if (!attribute) return null;
  const i = Math.round(attribute.getX(face.a));
  return batch.parts[i] ?? null;
}

/** Keep only the fragments of parts that are currently emphasised. */
function attachHighlightState(
  material: THREE.MeshStandardMaterial,
  texture: THREE.DataTexture,
  width: number,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['partState'] = { value: texture };
    shader.uniforms['partStateWidth'] = { value: width };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float partIndex;
        varying float vPartIndex;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPartIndex = partIndex;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D partState;
        uniform float partStateWidth;
        varying float vPartIndex;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec2 stateUv = vec2((vPartIndex + 0.5) / partStateWidth, 0.5);
        vec4 state = texture2D(partState, stateUv);
        if (state.g < 0.5 || state.r < 0.5) discard;`);
  };
  material.needsUpdate = true;
}

export function disposeBatch(batch: SystemBatch): void {
  batch.mesh.geometry.dispose();
  batch.material.dispose();
  batch.highlightMaterial.dispose();
  batch.texture.dispose();
}
