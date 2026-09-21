import { useEffect, useRef } from 'react';
import { createScene, type AnatomyScene } from '../atlas/scene';
import { resolve } from '../atlas/selection';
import { loadCatalogue } from '../atlas/studyModels';
import { useAtlas } from '../state/store';
import { ORBIT_DIRECTION, ORBIT_STEP, ZOOM_STEP } from '../atlas/camera';

/**
 * The 3D canvas.
 *
 * React owns the DOM node; the scene owns everything inside it, and the two
 * talk through a ref rather than through re-renders — a three.js scene must
 * not be rebuilt every time a panel opens.
 */
export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<AnatomyScene | null>(null);

  const selected = useAtlas((s) => s.selected);
  const shown = useAtlas((s) => s.shown);
  const isolate = useAtlas((s) => s.isolate);
  const reveal = useAtlas((s) => s.reveal);
  const xray = useAtlas((s) => s.xray);
  const spin = useAtlas((s) => s.spin);
  const focusRequest = useAtlas((s) => s.focusRequest);
  const camera = useAtlas((s) => s.camera);
  const select = useAtlas((s) => s.select);
  const setReady = useAtlas((s) => s.setReady);
  const setManifest = useAtlas((s) => s.setManifest);
  const setLoading = useAtlas((s) => s.setLoading);
  const setLoadError = useAtlas((s) => s.setLoadError);
  const studyModel = useAtlas((s) => s.studyModel);
  const setStudyCatalogue = useAtlas((s) => s.setStudyCatalogue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: AnatomyScene | null = null;

    void (async () => {
      try {
        scene = await createScene(canvas, { onSelect: (id) => select(id) });
      } catch (error) {
        // Nothing renders without the manifest, so say why rather than
        // leaving a boot screen up for ever.
        if (!disposed) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
        return;
      }
      if (disposed) { scene.dispose(); return; }
      sceneRef.current = scene;
      setManifest(scene.manifest);
      // The study-model index is small and needed before the picker can be
      // drawn, so it is fetched alongside the body rather than on demand.
      void loadCatalogue().then(setStudyCatalogue).catch(() => {
        // Study models are an addition, not a prerequisite: the body works
        // without them.
      });

      // Stream the opening systems one at a time, so the first of them is on
      // screen while the rest are still arriving.
      for (const system of useAtlas.getState().shown) {
        if (disposed) return;
        setLoading(system, true);
        try {
          await scene.loadSystem(system);
        } finally {
          setLoading(system, false);
        }
        setReady(true);
      }
      setReady(true);
    })();

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // Built once; later state changes are pushed through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap between the whole body and a reviewed study model.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (scene.studyModelId() === (studyModel?.id ?? null)) return;
    void scene.showStudyModel(studyModel);
  }, [studyModel]);

  // Load or reveal systems as the reader turns them on.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;

    // Systems belong to the whole body; a study model has none.
    if (studyModel) return;

    void (async () => {
      for (const system of shown) {
        if (cancelled) return;
        if (!scene.isLoaded(system)) {
          setLoading(system, true);
          try {
            await scene.loadSystem(system);
          } finally {
            setLoading(system, false);
          }
        }
        scene.setSystemVisible(system, true);
      }
      // Hiding keeps the geometry in memory: turning a system back on should
      // not cost the download again.
      for (const system of [...scene.manifest.parts].map((p) => p.system)) {
        if (!shown.has(system) && scene.isLoaded(system)) {
          scene.setSystemVisible(system, false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [shown, setLoading, studyModel]);

  useEffect(() => { sceneRef.current?.select(selected, { focus: false }); }, [selected]);

  // Framing waits for the geometry: focusing an organ whose system is still
  // downloading would move the camera to an empty stretch of space.
  useEffect(() => {
    if (!focusRequest || !selected) return;
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;
    const tryFocus = () => {
      if (cancelled) return true;
      // A concept id is not a mesh id, so resolve it first. Waiting on the
      // structure's own system is enough: that is the one being loaded, and
      // framing everything it touches would mean waiting on systems the
      // reader never asked for.
      const target = resolve(scene.index, selected);
      if (!target) return true;
      if (!scene.isLoaded(target.system)) return false;
      scene.focus(selected);
      return true;
    };
    if (tryFocus()) return;
    const timer = setInterval(() => { if (tryFocus()) clearInterval(timer); }, 250);
    const stop = setTimeout(() => clearInterval(timer), 20_000);
    return () => { cancelled = true; clearInterval(timer); clearTimeout(stop); };
  }, [focusRequest, selected]);
  // Camera commands from the controls and the keyboard. Keyed on the nonce
  // so pressing the same button twice moves twice.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !camera) return;
    const { kind } = camera;
    if (kind === 'zoomIn') scene.zoomBy(ZOOM_STEP.in);
    else if (kind === 'zoomOut') scene.zoomBy(ZOOM_STEP.out);
    else if (kind === 'reset') scene.resetView();
    else if (kind === 'frame') {
      const id = useAtlas.getState().selected;
      if (id) scene.focus(id);
      else scene.resetView();
    } else if (kind === 'snapshot') void saveSnapshot(scene);
    else if (kind.startsWith('view:')) {
      scene.setView(kind.slice('view:'.length) as Parameters<typeof scene.setView>[0]);
    } else if (kind.startsWith('orbit:')) {
      const way = kind.slice('orbit:'.length) as keyof typeof ORBIT_DIRECTION;
      const [theta, phi] = ORBIT_DIRECTION[way];
      scene.orbitBy(theta * ORBIT_STEP, phi * ORBIT_STEP);
    }
  }, [camera]);

  useEffect(() => { sceneRef.current?.setIsolate(isolate); }, [isolate]);
  useEffect(() => { sceneRef.current?.setReveal(reveal); }, [reveal]);
  useEffect(() => { sceneRef.current?.setXray(xray); }, [xray]);
  useEffect(() => { sceneRef.current?.setSpin(spin); }, [spin]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      aria-label="Three-dimensional model of the human body"
    />
  );
}

/** Hand the reader a PNG of what they are looking at. */
async function saveSnapshot(scene: AnatomyScene): Promise<void> {
  const blob = await scene.snapshot();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `anatomyca-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
  link.click();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
