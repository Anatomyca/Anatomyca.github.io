import { describe, expect, it } from 'vitest';
import {
  isDoubleTap, DOUBLE_TAP_MS, DOUBLE_TAP_SLOP, ORBIT_DIRECTION, ZOOM_STEP,
} from '../../src/atlas/camera';

describe('double-tap', () => {
  const first = { x: 100, y: 200, t: 1000 };

  it('is not a double-tap when there is no previous press', () => {
    expect(isDoubleTap(first, null)).toBe(false);
  });

  it('accepts a quick second press in the same place', () => {
    expect(isDoubleTap({ x: 102, y: 203, t: 1180 }, first)).toBe(true);
  });

  it('rejects a second press that came too late', () => {
    expect(isDoubleTap({ x: 100, y: 200, t: 1000 + DOUBLE_TAP_MS }, first)).toBe(false);
    // A slow device is exactly when this matters: the first tap's own work
    // must not be able to turn a real double-tap into two singles, which is
    // why the window is measured press to press rather than release to
    // release.
    expect(isDoubleTap({ x: 100, y: 200, t: 1399 }, first)).toBe(true);
  });

  it('rejects a second press somewhere else on the screen', () => {
    expect(isDoubleTap({ x: 100 + DOUBLE_TAP_SLOP, y: 200, t: 1100 }, first)).toBe(false);
    expect(isDoubleTap({ x: 100, y: 200 + DOUBLE_TAP_SLOP, t: 1100 }, first)).toBe(false);
  });
});

describe('camera steps', () => {
  it('zooms in and out by reciprocal factors, so a pair returns where it began', () => {
    expect(ZOOM_STEP.in * ZOOM_STEP.out).toBeCloseTo(1, 10);
  });

  it('zooms in by moving closer and out by moving further', () => {
    expect(ZOOM_STEP.in).toBeLessThan(1);
    expect(ZOOM_STEP.out).toBeGreaterThan(1);
  });

  it('gives every arrow key an opposite', () => {
    expect(ORBIT_DIRECTION.left[0]).toBe(-ORBIT_DIRECTION.right[0]);
    expect(ORBIT_DIRECTION.up[1]).toBe(-ORBIT_DIRECTION.down[1]);
  });
});
