/**
 * The 3D side of the atlas.
 *
 * Three things keep it usable on a mid-range phone:
 *   1. one mesh per structure, so a full body is under forty draw calls;
 *   2. render on demand — frames are drawn only when something changed, so
 *      a still model costs no battery;
 *   3. resolution and buffers give way under pressure rather than letting
 *      the tab be killed. See releaseHidden() and the context-loss handler.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SEED_STRUCTURES } from '../data/structures';
import { BUILDERS, TWO_SIDED, BODY, hasBuilder } from './geometry';
import { VIEWS } from './views';
import type { Structure } from '../domain/types';

/** Shape of the optional models/manifest.json, when one is present. */
interface ModelsManifest {
  scale?: number;
  offset?: [number, number, number];
  files?: Record<string, Record<string, string>>;
}

export interface PartRecord {
  part: Structure;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseOpacity: number;
  box: THREE.Box3;
  sphere: THREE.Sphere;
}

export type ViewName = keyof typeof VIEWS;
export type ClipAxis = 'x' | 'y' | 'z';

export interface Viewer {
  onSelect: ((id: string | null) => void) | null;
  onHover: ((id: string | null) => void) | null;
  onFrame: ((dt: number) => void) | null;
  parts: Map<string, PartRecord>;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  build(onProgress?: (fraction: number, part: Structure) => void): Promise<void>;
  loadModels(): Promise<void>;
  setSystemVisible(system: string, on: boolean): void;
  isSystemVisible(system: string): boolean;
  setXray(value: number): void;
  setIsolate(on: boolean): void;
  getIsolate(): boolean;
  setClip(axis: ClipAxis, amount: number): void;
  setSpin(on: boolean): void;
  setBackground(css: string): void;
  select(id: string | null, options?: { focus?: boolean }): void;
  getSelected(): string | null;
  focus(id: string): void;
  setView(name: ViewName): void;
  resetView(): void;
  screenPos(id: string): { x: number; y: number } | null;
  invalidate(): void;
  /** Frees GPU buffers for hidden systems. Returns how many were freed. */
  releaseHidden(): number;
  dispose(): void;
}

/** Tissue colours, chosen to read clearly rather than to match a cadaver. */
const TINT: Record<string, string> = {
  skin: '#d6b099',
  brain: '#cfb3ae', cerebellum: '#c0a09b', 'spinal-cord': '#e3d7a6', sciatic: '#e4c766',
  heart: '#b53c35', aorta: '#c2413a', 'vena-cava': '#456fa0', pulmonary: '#7481b4', carotids: '#c2413a',
  trachea: '#9dbcd0', bronchi: '#88a9c0', lungs: '#d18e93', diaphragm: '#b4736a',
  oesophagus: '#c79a8e', stomach: '#c08a72', liver: '#7e4038', gallbladder: '#6f8a48',
  pancreas: '#c9a06a', 'small-intestine': '#d3a07a', 'large-intestine': '#bd8b66',
  kidneys: '#8c4a44', ureters: '#a9b07c', bladder: '#b9c082',
  thyroid: '#b07bbf', adrenals: '#c79ad2', spleen: '#8a4f60',
};
const BONE = '#e7dec9';
const SELECT = new THREE.Color('#c8504a');

const clamp = THREE.MathUtils.clamp;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createViewer(canvas: HTMLCanvasElement): Viewer {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  /* ── renderer ─────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
  camera.position.set(0, 1.05, 3.1);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.42;

  const key = new THREE.DirectionalLight(0xfff3e4, 2.1);
  key.position.set(1.4, 2.2, 2.6);
  const fill = new THREE.DirectionalLight(0xbcd2e4, 0.7);
  fill.position.set(-1.8, 0.7, -1.4);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(0.2, 1.6, -2.6);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xa8c2d6, 0x1a2630, 0.55));

  /* ── controls ─────────────────────────────────────────────── */
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(BODY.centre);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.7;
  controls.minDistance = 0.28;
  controls.maxDistance = 5;
  controls.autoRotateSpeed = 0.9;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.addEventListener('change', invalidate);

  /* ── ground shadow ────────────────────────────────────────── */
  scene.add(makeGround());

  /* ── state ────────────────────────────────────────────────── */
  const root = new THREE.Group();
  scene.add(root);

  const parts = new Map<string, PartRecord>();
  let pickable: THREE.Mesh[] = [];
  let selected: string | null = null;
  let hovered: string | null = null;
  let isolate = false;
  let xray = 0;
  const hiddenSystems = new Set();

  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 10);
  let clipAxis: ClipAxis = 'z';
  let clipAmount = 0;

  // Methods are attached below; the cast lets them be assigned one at a
  // time while callers still see the full Viewer surface.
  const api = {
    onSelect: null, onHover: null, onFrame: null,
    parts, controls, camera,
  } as unknown as Viewer;

  /* ── building ─────────────────────────────────────────────── */
  api.build = async function build(onProgress?: (fraction: number, part: Structure) => void): Promise<void> {
    for (let i = 0; i < SEED_STRUCTURES.length; i++) {
      const part = SEED_STRUCTURES[i]!;
      const make = part.build && hasBuilder(part.build) ? BUILDERS[part.build] : null;
      if (!make) continue;

      const geo = make();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(TINT[part.id] || BONE),
        roughness: part.system === 'skeletal' ? 0.62 : 0.42,
        metalness: 0,
        side: TWO_SIDED.has(part.id) ? THREE.DoubleSide : THREE.FrontSide,
        clippingPlanes: [],
        transparent: part.id === 'skin',
        opacity: part.id === 'skin' ? 0.13 : 1,
        depthWrite: part.id !== 'skin',
      });

      const mesh = new THREE.Mesh(geo, material);
      mesh.name = part.id;
      mesh.userData.id = part.id;
      mesh.renderOrder = part.id === 'skin' ? 10 : 0;
      root.add(mesh);

      parts.set(part.id, {
        part, mesh, material,
        baseOpacity: part.id === 'skin' ? 0.13 : 1,
        box: geo.boundingBox!.clone(),
        sphere: geo.boundingSphere!.clone(),
      });

      onProgress?.((i + 1) / SEED_STRUCTURES.length, part);
      if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
    }
    refreshVisibility();
    invalidate();
  };

  /**
   * Optional: replace generated shapes with real meshes. If
   * models/manifest.json is present it is loaded after the body is up, so
   * the atlas is usable in the first second either way. Format and worked
   * example in models/README.md.
   */
  api.loadModels = async function loadModels(): Promise<void> {
    let manifest: ModelsManifest;
    try {
      const res = await fetch('models/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      manifest = (await res.json()) as ModelsManifest;
    } catch { return; }

    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const scale = manifest.scale ?? 1;
    const offset = manifest.offset ?? [0, 0, 0];

    for (const [file, map] of Object.entries<Record<string, string>>(manifest.files ?? {})) {
      let gltf: Awaited<ReturnType<typeof loader.loadAsync>>;
      try { gltf = await loader.loadAsync(`models/${file}`); } catch { continue; }
      for (const [partId, nodeName] of Object.entries(map)) {
        const rec = parts.get(partId);
        const node = gltf.scene.getObjectByName(nodeName);
        const geoNode = node as THREE.Mesh | undefined;
        if (!rec || !geoNode?.geometry) continue;
        geoNode.updateWorldMatrix(true, false);
        const geo = (geoNode.geometry as THREE.BufferGeometry).clone().applyMatrix4(geoNode.matrixWorld);
        geo.scale(scale, scale, scale);
        geo.translate(offset[0] ?? 0, offset[1] ?? 0, offset[2] ?? 0);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        rec.mesh.geometry.dispose();
        rec.mesh.geometry = geo;
        rec.box = geo.boundingBox!.clone();
        rec.sphere = geo.boundingSphere!.clone();
      }
    }
    invalidate();
  };

  /* ── visibility, opacity, clipping ────────────────────────── */
  function refreshVisibility() {
    pickable = [];
    for (const rec of parts.values()) {
      const sysOff = hiddenSystems.has(rec.part.system);
      const isSel = selected === rec.part.id;
      const hide = sysOff || (isolate && selected && !isSel);
      rec.mesh.visible = !hide;
      if (!hide) pickable.push(rec.mesh);

      let o = rec.baseOpacity;
      if (xray > 0 && !isSel) o = Math.min(o, 1 - xray * 0.92);

      const wantTransparent = o < 0.999;
      if (rec.material.transparent !== wantTransparent) {
        rec.material.transparent = wantTransparent;
        rec.material.depthWrite = !wantTransparent;
        rec.material.needsUpdate = true;
      }
      rec.material.opacity = o;

      const emph = isSel ? 0.42 : hovered === rec.part.id ? 0.16 : 0;
      rec.material.emissive.copy(SELECT).multiplyScalar(emph);
    }
    invalidate();
  }

  api.setSystemVisible = (sys, on) => {
    if (on) hiddenSystems.delete(sys); else hiddenSystems.add(sys);
    if (!on && selected && parts.get(selected)?.part.system === sys) api.select(null);
    else refreshVisibility();
  };
  api.isSystemVisible = (sys) => !hiddenSystems.has(sys);

  api.setXray = (v) => { xray = clamp(v, 0, 1); refreshVisibility(); };
  api.setIsolate = (on) => { isolate = !!on; refreshVisibility(); };
  api.getIsolate = () => isolate;

  /** Slice the body open. The plane keeps everything on its positive side. */
  const CLIP: Record<ClipAxis, { normal: [number, number, number]; from: number; to: number }> = {
    z: { normal: [0, 0, -1], from: 0.30, to: -0.24 },   // shave off the front
    x: { normal: [-1, 0, 0], from: 0.32, to: -0.30 },   // shave off the model's left
    y: { normal: [0, -1, 0], from: 1.86, to: 0.02 },    // shave off the top
  };

  api.setClip = (axis, amount) => {
    clipAxis = axis in CLIP ? axis : 'z';
    clipAmount = clamp(amount, 0, 1);
    const spec = CLIP[clipAxis];
    clipPlane.normal.set(spec.normal[0], spec.normal[1], spec.normal[2]);
    clipPlane.constant = THREE.MathUtils.lerp(spec.from, spec.to, clipAmount);
    const next = clipAmount > 0.001 ? [clipPlane] : [];
    for (const rec of parts.values()) {
      if ((rec.material.clippingPlanes ?? []).length !== next.length) rec.material.needsUpdate = true;
      rec.material.clippingPlanes = next;
    }
    invalidate();
  };

  api.setSpin = (on) => { controls.autoRotate = !!on; invalidate(); };

  api.setBackground = (css) => {
    try { renderer.setClearColor(new THREE.Color(css.trim()), 1); invalidate(); } catch { /* keep the old colour */ }
  };

  /* ── selection ────────────────────────────────────────────── */
  api.select = (id, { focus = false } = {}) => {
    if (id && !parts.has(id)) return;
    selected = id || null;
    if (selected) {
      const sys = parts.get(selected)!.part.system;
      if (hiddenSystems.has(sys)) hiddenSystems.delete(sys);
    }
    refreshVisibility();
    if (selected && focus) api.focus(selected);
    api.onSelect?.(selected);
  };
  api.getSelected = () => selected;

  /* ── camera moves ─────────────────────────────────────────── */
  interface CameraMove {
    fromPos: THREE.Vector3; toPos: THREE.Vector3;
    fromTgt: THREE.Vector3; toTgt: THREE.Vector3;
    start: number; ms: number;
  }

  let anim: CameraMove | null = null;

  function moveTo(position: THREE.Vector3, target: THREE.Vector3, ms = 700): void {
    if (reduceMotion || ms === 0) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      invalidate();
      return;
    }
    anim = {
      ms,
      fromPos: camera.position.clone(), toPos: position.clone(),
      fromTgt: controls.target.clone(), toTgt: target.clone(),
      start: performance.now(),
    };
    invalidate();
  }

  api.focus = (id) => {
    const rec = parts.get(id);
    if (!rec) return;
    const c = rec.sphere.center;
    const r = Math.max(rec.sphere.radius, 0.05);
    const dist = clamp((r / Math.sin((camera.fov * Math.PI) / 360)) * 1.35, 0.32, 3.2);
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    moveTo(new THREE.Vector3().copy(c).addScaledVector(dir, dist), c.clone());
  };

  api.setView = (name) => {
    const v = VIEWS[name] ?? VIEWS.front;
    const target = selected ? parts.get(selected)!.sphere.center.clone() : BODY.centre.clone();
    const dist = camera.position.distanceTo(controls.target);
    const sph = new THREE.Spherical(dist, v.phi, v.theta);
    moveTo(new THREE.Vector3().setFromSpherical(sph).add(target), target);
  };

  api.resetView = () => moveTo(new THREE.Vector3(0, 1.05, 3.1), BODY.centre.clone());

  api.screenPos = (id) => {
    const rec = parts.get(id);
    if (!rec || !rec.mesh.visible) return null;
    const v = rec.sphere.center.clone().project(camera);
    if (v.z > 1) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height };
  };

  /* ── picking ──────────────────────────────────────────────── */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickable, false);
    for (const h of hits) {
      // the skin shell is see-through, so only take it if nothing is behind it
      if (h.object.name === 'skin' && hits.length > 1) continue;
      if (clipAmount > 0.001 && clipPlane.distanceToPoint(h.point) < 0) continue;
      return h.object.name;
    }
    return null;
  }

  let down: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 700;
    down = null;
    if (moved > 8 || !quick) return;
    const id = pick(e.clientX, e.clientY);
    api.select(id, { focus: false });
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
        refreshVisibility();
        api.onHover?.(id);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (hovered) { hovered = null; refreshVisibility(); api.onHover?.(null); }
    });
  }

  /* ── render state ─────────────────────────────────────────── */
  let running = true;
  let dirty = true;
  let dpr = Math.min(devicePixelRatio, 2);
  let slowFrames = 0;
  let lastFrame = performance.now();

  function invalidate() { dirty = true; }
  api.invalidate = invalidate;

  /* ── resize ───────────────────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ── loop ─────────────────────────────────────────────────── */
  function tick(now: number): void {
    requestAnimationFrame(tick);
    if (!running) return;

    if (anim) {
      const t = clamp((now - anim.start) / anim.ms, 0, 1);
      const e = easeInOut(t);
      camera.position.lerpVectors(anim.fromPos, anim.toPos, e);
      controls.target.lerpVectors(anim.fromTgt, anim.toTgt, e);
      if (t >= 1) anim = null;
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
    if (dt > 26) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 24 && dpr > 1) {           // quietly drop resolution rather than stutter
      dpr = 1;
      renderer.setPixelRatio(dpr);
      resize();
      slowFrames = 0;
    }
    api.onFrame?.(dt);
  }
  requestAnimationFrame(tick);

  /* ── surviving a low-memory phone ─────────────────────────── */

  /**
   * A lost WebGL context is the normal way iOS Safari and low-RAM Android
   * reclaim memory. Without this the canvas simply goes black and the
   * student thinks the app broke, so preventDefault() asks the browser to
   * restore it and the scene is redrawn when it comes back.
   */
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    running = true;
    for (const rec of parts.values()) rec.material.needsUpdate = true;
    resize();
    invalidate();
  });

  /**
   * Free the GPU buffers of systems that have been hidden for a while.
   * Geometry stays in memory and is re-uploaded on demand, which is far
   * cheaper than having the tab reloaded under us.
   */
  api.releaseHidden = function releaseHidden(): number {
    let freed = 0;
    for (const rec of parts.values()) {
      if (hiddenSystems.has(rec.part.system)) {
        rec.mesh.geometry.dispose();
        freed++;
      }
    }
    return freed;
  };

  api.dispose = function dispose(): void {
    running = false;
    controls.dispose();
    for (const rec of parts.values()) {
      rec.mesh.geometry.dispose();
      rec.material.dispose();
    }
    parts.clear();
    environment.texture.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return api;
}

/* ── a soft contact shadow so the body isn't floating ────────── */
function makeGround() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.16)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  mesh.renderOrder = -1;
  return mesh;
}
