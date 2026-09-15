import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadManifest, type Bp3dManifest, type Bp3dPart } from './manifest';
import {
  buildSystemBatch, disposeBatch, partAtIntersection, setPartState,
  type SystemBatch,
} from './renderer';
import { baseOpacityOf, LITE_SYSTEMS } from './systems';
import { buildIndex, resolve, systemsOf, type AtlasIndex, type Selection } from './selection';

/**
 * The anatomy scene.
 *
 * Systems stream in one at a time and each becomes a single batched mesh.
 * Rendering is on demand — a still model draws no frames — and resolution
 * and GPU buffers give way under pressure rather than letting the tab be
 * killed on a low-RAM phone.
 */

export interface SceneEvents {
  onSelect?: (partId: string | null) => void;
  onHover?: (partId: string | null) => void;
  onSystemLoaded?: (system: string, loaded: number, total: number) => void;
}

export interface AnatomyScene {
  manifest: Bp3dManifest;
  index: AtlasIndex;
  loadSystem(system: string): Promise<void>;
  unloadSystem(system: string): void;
  isLoaded(system: string): boolean;
  setSystemVisible(system: string, visible: boolean): void;
  /** Accepts an element mesh id or an FMA concept id. */
  select(id: string | null, options?: { focus?: boolean }): void;
  focus(id: string): void;
  getSelection(): Selection | null;
  setIsolate(on: boolean): void;
  setXray(value: number): void;
  setSpin(on: boolean): void;
  setView(name: 'front' | 'back' | 'left' | 'right' | 'top'): void;
  resetView(): void;
  partById(id: string): Bp3dPart | undefined;
  invalidate(): void;
  dispose(): void;
}

const VIEWS = {
  front: { theta: 0, phi: 1.5 },
  back: { theta: Math.PI, phi: 1.5 },
  left: { theta: Math.PI / 2, phi: 1.5 },
  right: { theta: -Math.PI / 2, phi: 1.5 },
  top: { theta: 0, phi: 0.22 },
} as const;

const BODY_CENTRE = new THREE.Vector3(0, 0.95, 0);
const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export async function createScene(
  canvas: HTMLCanvasElement,
  events: SceneEvents = {},
): Promise<AnatomyScene> {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
  camera.position.set(0, 1.05, 3.1);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;

  const key = new THREE.DirectionalLight(0xfff3e4, 1.9);
  key.position.set(2.2, 3.4, 2.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2e4, 0.6);
  fill.position.set(-2.4, 1.2, -1.8);
  scene.add(fill);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(BODY_CENTRE);
  controls.minDistance = 0.25;
  controls.maxDistance = 8;
  controls.autoRotateSpeed = 1.1;

  const root = new THREE.Group();
  scene.add(root);

  const manifest = await loadManifest();
  const index = buildIndex(manifest);
  const partsById = index.parts;
  const batches = new Map<string, SystemBatch>();
  const hiddenSystems = new Set<string>();

  let selection: Selection | null = null;
  let selectedElements = new Set<string>();
  let hovered: string | null = null;
  let isolate = false;
  let xray = 0;
  let running = true;
  let dirty = true;
  let dpr = Math.min(devicePixelRatio, coarse ? 1.5 : 2);
  let slowFrames = 0;
  let lastFrame = performance.now();

  function invalidate(): void { dirty = true; }

  function resize(): void {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /** Push selection, hover, isolate and see-through into every batch. */
  function refresh(): void {
    for (const batch of batches.values()) {
      const systemHidden = hiddenSystems.has(batch.system);
      batch.mesh.visible = !systemHidden;
      const base = baseOpacityOf(batch.system);
      for (const part of batch.parts) {
        const isSelected = selectedElements.has(part.id);
        const hide = isolate && selection !== null && !isSelected;
        // A selected structure is always solid; everything else sits at its
        // system's resting opacity, reduced further by the see-through dial.
        const opacity = isSelected
          ? 1
          : Math.max(0.04, base * (1 - xray * 0.94));
        setPartState(batch, part.id, {
          visible: !hide,
          emphasis: isSelected ? 1 : part.id === hovered ? 0.35 : 0,
          opacity,
        });
      }
      // Fully opaque batches can skip blending entirely.
      const needsBlend = xray > 0 || base < 1;
      if (batch.material.transparent !== needsBlend) {
        batch.material.transparent = needsBlend;
        batch.material.depthWrite = !needsBlend;
        batch.material.needsUpdate = true;
      }
    }
    invalidate();
  }

  async function loadSystem(system: string): Promise<void> {
    if (batches.has(system)) return;
    const batch = await buildSystemBatch(manifest, system);
    if (!batch) return;
    batches.set(system, batch);
    root.add(batch.mesh);
    refresh();
    events.onSystemLoaded?.(system, batches.size, LITE_SYSTEMS.length);
  }

  function unloadSystem(system: string): void {
    const batch = batches.get(system);
    if (!batch) return;
    root.remove(batch.mesh);
    disposeBatch(batch);
    batches.delete(system);
    invalidate();
  }

  /* ── picking ──────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);

    const meshes = [...batches.values()].filter((b) => b.mesh.visible).map((b) => b.mesh);
    for (const hit of ray.intersectObjects(meshes, false)) {
      const batch = batches.get(hit.object.name);
      if (!batch) continue;
      const part = partAtIntersection(batch, hit);
      if (!part) continue;
      // A part switched off by isolate must not be pickable through it.
      const row = batch.index.get(part.id);
      if (row !== undefined && batch.state[row * 4] === 0) continue;
      return part.id;
    }
    return null;
  }

  let down: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 700;
    down = null;
    if (moved > 8 || !quick) return;  // a drag is an orbit, not a tap
    api.select(pick(e.clientX, e.clientY));
  });

  if (!coarse) {
    let last = 0;
    canvas.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 70 || down) return;
      last = now;
      const id = pick(e.clientX, e.clientY);
      if (id !== hovered) {
        hovered = id;
        canvas.style.cursor = id ? 'pointer' : 'grab';
        refresh();
        events.onHover?.(id);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (hovered) { hovered = null; refresh(); events.onHover?.(null); }
    });
  }

  /* ── camera moves ─────────────────────────────────────────── */
  interface Move {
    fromPos: THREE.Vector3; toPos: THREE.Vector3;
    fromTgt: THREE.Vector3; toTgt: THREE.Vector3;
    start: number; ms: number;
  }
  let move: Move | null = null;

  function moveTo(position: THREE.Vector3, target: THREE.Vector3, ms = 700): void {
    if (reduceMotion || ms === 0) {
      camera.position.copy(position);
      controls.target.copy(target);
      invalidate();
      return;
    }
    move = {
      ms,
      fromPos: camera.position.clone(), toPos: position.clone(),
      fromTgt: controls.target.clone(), toTgt: target.clone(),
      start: performance.now(),
    };
  }

  function centreOf(part: Bp3dPart): { centre: THREE.Vector3; radius: number } {
    const [min, max] = part.bounds;
    const lo = new THREE.Vector3(min[0], min[1], min[2]);
    const hi = new THREE.Vector3(max[0], max[1], max[2]);
    const centre = lo.clone().add(hi).multiplyScalar(0.5);
    return { centre, radius: Math.max(0.04, lo.distanceTo(hi) / 2) };
  }

  const api: AnatomyScene = {
    manifest,
    index,
    loadSystem,
    unloadSystem,
    isLoaded: (system) => batches.has(system),

    setSystemVisible(system, visible) {
      if (visible) hiddenSystems.delete(system);
      else hiddenSystems.add(system);
      refresh();
    },

    select(id, options) {
      if (id === null) {
        selection = null;
        selectedElements = new Set();
        refresh();
        events.onSelect?.(null);
        return;
      }
      const next = resolve(index, id);
      if (!next) return;
      selection = next;
      selectedElements = new Set(next.elements);
      // A selection must never be invisible, and a concept can span systems.
      for (const system of systemsOf(index, next)) hiddenSystems.delete(system);
      if (options?.focus) api.focus(id);
      refresh();
      events.onSelect?.(id);
    },

    getSelection: () => selection,

    focus(id) {
      const target = resolve(index, id);
      if (!target) return;
      // Frame the whole selection, which for a concept is all its meshes.
      const box = new THREE.Box3();
      for (const element of target.elements) {
        const part = partsById.get(element);
        if (!part) continue;
        const [min, max] = part.bounds;
        box.expandByPoint(new THREE.Vector3(min[0], min[1], min[2]));
        box.expandByPoint(new THREE.Vector3(max[0], max[1], max[2]));
      }
      if (box.isEmpty()) return;
      const centre = box.getCenter(new THREE.Vector3());
      const radius = Math.max(0.04, box.getSize(new THREE.Vector3()).length() / 2);
      const direction = camera.position.clone().sub(controls.target).normalize();
      moveTo(centre.clone().add(direction.multiplyScalar(Math.max(0.3, radius * 3.2))), centre);
    },

    setIsolate(on) { isolate = on; refresh(); },
    setXray(value) { xray = THREE.MathUtils.clamp(value, 0, 1); refresh(); },
    setSpin(on) { controls.autoRotate = on; invalidate(); },

    setView(name) {
      const v = VIEWS[name];
      const anchor = selection?.elements[0];
      const target = anchor && partsById.has(anchor)
        ? centreOf(partsById.get(anchor)!).centre
        : BODY_CENTRE.clone();
      const distance = camera.position.distanceTo(controls.target);
      const spherical = new THREE.Spherical(distance, v.phi, v.theta);
      moveTo(new THREE.Vector3().setFromSpherical(spherical).add(target), target);
    },

    resetView() { moveTo(new THREE.Vector3(0, 1.05, 3.1), BODY_CENTRE.clone()); },
    partById: (id) => partsById.get(id),
    invalidate,

    dispose() {
      running = false;
      controls.dispose();
      for (const batch of batches.values()) disposeBatch(batch);
      batches.clear();
      environment.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };

  controls.addEventListener('change', invalidate);

  /* ── loop ─────────────────────────────────────────────────── */
  function tick(now: number): void {
    requestAnimationFrame(tick);
    if (!running) return;

    if (move) {
      const t = THREE.MathUtils.clamp((now - move.start) / move.ms, 0, 1);
      const e = easeInOut(t);
      camera.position.lerpVectors(move.fromPos, move.toPos, e);
      controls.target.lerpVectors(move.fromTgt, move.toTgt, e);
      if (t >= 1) move = null;
      dirty = true;
    }
    if (controls.enableDamping || controls.autoRotate) {
      if (controls.update()) dirty = true;
    }
    if (!dirty) return;
    dirty = false;

    renderer.render(scene, camera);

    const dt = now - lastFrame;
    lastFrame = now;
    if (dt > 26) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 24 && dpr > 1) {  // drop resolution rather than stutter
      dpr = 1;
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
  }
  requestAnimationFrame(tick);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });
  canvas.addEventListener('webglcontextrestored', () => {
    running = true;
    for (const batch of batches.values()) batch.material.needsUpdate = true;
    resize();
    invalidate();
  });

  return api;
}
