import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import type { Language } from '../domain/types';

/**
 * Open3Dmodel study models.
 *
 * These differ from the BodyParts3D body in the way that matters most: every
 * structure has been reviewed by subject-expert anatomists, which is what
 * Grade A means. They also arrive as individually named meshes — "Atlas
 * (C1)", "Lower first molar tooth (right)" — so each is selectable without a
 * separate manifest of byte offsets.
 *
 * They are modest enough in mesh count (144 at most) that one draw call each
 * is fine; the batching the whole body needs would buy nothing here.
 *
 * Licence: CC BY-SA 4.0. Shipping them makes the geometry pack ShareAlike,
 * which is recorded in LICENSE-DATA.md and enforced by check-licences.
 */

export interface StudyStructure {
  readonly id: string;
  readonly name: string;
  readonly triangles: number;
  readonly bounds: readonly [readonly number[], readonly number[]] | null;
}

/**
 * A = checked by anatomists, B = a published reference dataset, C = an
 * artist's model nobody has checked. The badge is shown wherever a model is
 * offered, because a student cannot tell the three apart by looking.
 */
export type Grade = 'A' | 'B' | 'C';

/** Who made a model, under what licence — generated per model at build time. */
export interface StudyCredit {
  readonly source: string;
  readonly label: string;
  readonly attribution: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly url: string;
  readonly creators?: readonly string[];
  readonly reviewedBy?: string;
}

export interface StudyModel {
  readonly id: string;
  readonly file: string;
  readonly grade: Grade;
  readonly credit: StudyCredit | null;
  readonly names: Readonly<Record<Language, string>>;
  readonly summary: Readonly<Record<Language, string>>;
  readonly bytes: number;
  readonly structures: readonly StudyStructure[];
  readonly bounds: readonly [readonly number[], readonly number[]] | null;
}

export interface StudyCatalogue {
  readonly source: string;
  readonly grade: Grade;
  readonly models: readonly StudyModel[];
}

let catalogue: Promise<StudyCatalogue> | null = null;

export function loadCatalogue(): Promise<StudyCatalogue> {
  catalogue ??= fetch(`${import.meta.env.BASE_URL}atlas/study-models.json`).then((res) => {
    if (!res.ok) throw new Error(`Cannot load the study models index (${res.status})`);
    return res.json() as Promise<StudyCatalogue>;
  });
  return catalogue;
}

/**
 * One loader for every model. The Draco decoder is a WASM module served from
 * the site itself rather than a CDN, so the atlas keeps working offline and
 * on a network that blocks third-party hosts.
 */
let loader: GLTFLoader | null = null;

function gltfLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

export interface LoadedStudyModel {
  readonly model: StudyModel;
  readonly group: THREE.Group;
  /** Structure id -> its mesh, for selection and framing. */
  readonly meshes: ReadonlyMap<string, THREE.Mesh>;
  dispose(): void;
}

export async function loadStudyModel(model: StudyModel): Promise<LoadedStudyModel> {
  const url = `${import.meta.env.BASE_URL}atlas/models/${model.file}`;
  const gltf = await gltfLoader().loadAsync(url);

  const group = new THREE.Group();
  group.name = `study:${model.id}`;
  const meshes = new Map<string, THREE.Mesh>();

  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    // Bake the world transform so every mesh can be reparented flat, which
    // keeps selection and framing from having to walk a hierarchy.
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const source = mesh.material as THREE.Material;
    const material = (Array.isArray(source) ? source[0]! : source).clone() as THREE.MeshStandardMaterial;
    // The exports are single-sided; anatomy is read from every angle.
    material.side = THREE.DoubleSide;
    material.transparent = true;

    const flat = new THREE.Mesh(geometry, material);
    flat.name = mesh.name;
    flat.userData['structureId'] = mesh.name;
    group.add(flat);
    meshes.set(mesh.name, flat);
  });

  return {
    model,
    group,
    meshes,
    dispose() {
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      meshes.clear();
      group.clear();
    },
  };
}

/** Display name in the reader's language, falling back to English. */
export function modelName(model: StudyModel, lang: Language): string {
  return model.names[lang] ?? model.names.en;
}

export function modelSummary(model: StudyModel, lang: Language): string {
  return model.summary[lang] ?? model.summary.en;
}
