import type { ViewName } from './scene';

/**
 * Every way a reader can move the camera without dragging.
 *
 * These are sent from the controls and the keyboard, and applied in the
 * viewport, where the scene actually lives.
 */
export type CameraCommand =
  | 'zoomIn'
  | 'zoomOut'
  | 'reset'
  | 'frame'
  | 'snapshot'
  | `view:${ViewName}`
  | `orbit:${'left' | 'right' | 'up' | 'down'}`;

/** Which way each orbit command turns, in units of ORBIT_STEP. */
export const ORBIT_DIRECTION = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
} as const satisfies Record<string, readonly [number, number]>;

/** How far one press moves. Relative, so it feels the same at any scale. */
export const ZOOM_STEP = { in: 0.72, out: 1 / 0.72 } as const;

/** One arrow-key press, in radians. 6° is small enough to hold down. */
export const ORBIT_STEP = (Math.PI / 180) * 6;

/**
 * Was this press the second half of a double-tap?
 *
 * Measured press-to-press rather than release-to-release: a first tap sets
 * off picking, a selection and a React pass, and on a slow device that work
 * lands between the two releases and swallows the window, so a real
 * double-tap reads as two singles.
 *
 * 400 ms and 40 px are the platform conventions — long enough to be
 * comfortable, short enough that a single tap is not left waiting.
 */
export const DOUBLE_TAP_MS = 400;
export const DOUBLE_TAP_SLOP = 40;

export function isDoubleTap(
  press: { x: number; y: number; t: number },
  previous: { x: number; y: number; t: number } | null,
): boolean {
  if (!previous) return false;
  return press.t - previous.t < DOUBLE_TAP_MS
    && Math.hypot(press.x - previous.x, press.y - previous.y) < DOUBLE_TAP_SLOP;
}
