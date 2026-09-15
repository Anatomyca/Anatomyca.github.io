import { useEffect, useRef } from 'react';
import { createViewer, type Viewer } from '../three/viewer';
import { useAtlas } from '../state/store';

/**
 * The 3D canvas. React owns the DOM node; the viewer owns everything inside
 * it, and the two talk through a ref rather than through re-renders — a
 * three.js scene must not be rebuilt every time a panel opens.
 */
export function Viewport({ onProgress }: { onProgress?: (fraction: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const selected = useAtlas((s) => s.selected);
  const hidden = useAtlas((s) => s.hidden);
  const isolate = useAtlas((s) => s.isolate);
  const xray = useAtlas((s) => s.xray);
  const clip = useAtlas((s) => s.clip);
  const spin = useAtlas((s) => s.spin);
  const select = useAtlas((s) => s.select);
  const setReady = useAtlas((s) => s.setReady);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewer = createViewer(canvas);
    viewerRef.current = viewer;
    viewer.onSelect = (id) => select(id);

    let cancelled = false;
    void viewer.build((fraction) => onProgress?.(fraction)).then(() => {
      if (cancelled) return;
      setReady(true);
      void viewer.loadModels();
    });

    return () => {
      cancelled = true;
      viewer.dispose();
      viewerRef.current = null;
    };
    // Built once. Later state changes are pushed through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { viewerRef.current?.select(selected, { focus: false }); }, [selected]);
  useEffect(() => { viewerRef.current?.setIsolate(isolate); }, [isolate]);
  useEffect(() => { viewerRef.current?.setXray(xray); }, [xray]);
  useEffect(() => { viewerRef.current?.setClip(clip.axis, clip.amount); }, [clip]);
  useEffect(() => { viewerRef.current?.setSpin(spin); }, [spin]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const rec of viewer.parts.values()) {
      viewer.setSystemVisible(rec.part.system, !hidden.has(rec.part.system));
    }
  }, [hidden]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      aria-label="Three-dimensional model of the human body"
    />
  );
}
