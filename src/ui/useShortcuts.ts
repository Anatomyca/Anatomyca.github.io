import { useEffect } from 'react';
import { useAtlas } from '../state/store';
import type { CameraCommand } from '../atlas/camera';

/**
 * Keyboard control of the viewer.
 *
 * Without this the camera is reachable only by dragging, which leaves anyone
 * working by keyboard — and anyone who cannot use a pointer accurately —
 * unable to turn the body at all. Orbit is on the arrow keys for that reason,
 * not as a convenience.
 *
 * Every shortcut is a single key with no modifier, so nothing here can
 * shadow a browser or screen-reader command.
 */
const KEYS: Record<string, CameraCommand> = {
  '+': 'zoomIn',
  '=': 'zoomIn',
  '-': 'zoomOut',
  '_': 'zoomOut',
  '0': 'reset',
  'f': 'frame',
  '1': 'view:front',
  '2': 'view:back',
  '3': 'view:left',
  '4': 'view:right',
  '5': 'view:top',
  '6': 'view:bottom',
};

/** Arrow keys orbit; the step is small enough that holding one is smooth. */
const ARROWS: Record<string, CameraCommand> = {
  ArrowLeft: 'orbit:left',
  ArrowRight: 'orbit:right',
  ArrowUp: 'orbit:up',
  ArrowDown: 'orbit:down',
};

export function useShortcuts(): void {
  const runCamera = useAtlas((s) => s.runCamera);
  const select = useAtlas((s) => s.select);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Never steal a key from someone typing, and never from a shortcut the
      // browser owns.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const arrow = ARROWS[event.key];
      if (arrow) {
        event.preventDefault();
        runCamera(arrow);
        return;
      }

      if (event.key === 'Escape') {
        select(null);
        return;
      }

      const command = KEYS[event.key.toLowerCase()];
      if (command) {
        event.preventDefault();
        runCamera(command);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runCamera, select]);
}

/** What the help panel lists, in the order a reader would try them. */
export const SHORTCUTS: readonly { keys: string; labelKey: string }[] = [
  { keys: '+ / −', labelKey: 'zoom' },
  { keys: '← ↑ → ↓', labelKey: 'orbit' },
  { keys: 'F', labelKey: 'fitView' },
  { keys: '0', labelKey: 'resetView' },
  { keys: '1 – 6', labelKey: 'views' },
  { keys: 'Esc', labelKey: 'clearSelection' },
];
