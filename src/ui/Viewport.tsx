import { useEffect, useRef } from 'react';
import { createScene, type AnatomyScene } from '../atlas/scene';
import { useAtlas } from '../state/store';

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
  const xray = useAtlas((s) => s.xray);
  const spin = useAtlas((s) => s.spin);
  const select = useAtlas((s) => s.select);
  const setReady = useAtlas((s) => s.setReady);
  const setManifest = useAtlas((s) => s.setManifest);
  const setLoading = useAtlas((s) => s.setLoading);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let scene: AnatomyScene | null = null;

    void (async () => {
      scene = await createScene(canvas, { onSelect: (id) => select(id) });
      if (disposed) { scene.dispose(); return; }
      sceneRef.current = scene;
      setManifest(scene.manifest);

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

  // Load or reveal systems as the reader turns them on.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;

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
  }, [shown, setLoading]);

  useEffect(() => { sceneRef.current?.select(selected, { focus: false }); }, [selected]);
  useEffect(() => { sceneRef.current?.setIsolate(isolate); }, [isolate]);
  useEffect(() => { sceneRef.current?.setXray(xray); }, [xray]);
  useEffect(() => { sceneRef.current?.setSpin(spin); }, [spin]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Three-dimensional model of the human body"
    />
  );
}
