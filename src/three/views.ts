/** Camera presets. Distance is in metres; the body is 1.75 m tall. */
export const VIEWS = {
  front: { theta: 0, phi: 1.5 },
  back: { theta: Math.PI, phi: 1.5 },
  left: { theta: Math.PI / 2, phi: 1.5 },
  right: { theta: -Math.PI / 2, phi: 1.5 },
  top: { theta: 0, phi: 0.22 },
} as const;
