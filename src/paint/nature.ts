// Sky and water fields shared by the post paintings.
import { clamp01, fbm, mix, noise, type RGB } from './engine';

export type SkyPalette = {
  top: RGB;
  mid: RGB;
  low: RGB;
  glow: RGB;
  sun: RGB;
  cloudShade: RGB;
  cloudDeep: RGB;
  cloudLit: RGB;
};

export type SkyLayout = {
  sunU: number;
  sunV: number;
  /** Height of the cloud band's centre, and how thick it is. */
  cloudV: number;
  cloudW: number;
  /** Shifts the noise so each painting gets its own clouds. */
  seed: number;
  /** Radius of the sun's glow. */
  glowR?: number;
  /** Draw the sun's disc. */
  disc?: boolean;
};

/** Sky colour at (u, v), with a glowing sun and a band of lit cumulus. */
export function sky(p: SkyPalette, l: SkyLayout) {
  return (u: number, v: number, aspect: number): RGB => {
    let c = mix(p.top, p.mid, clamp01(v / 0.45));
    c = mix(c, p.low, clamp01((v - 0.45) / 0.3));
    const ds = Math.hypot((u - l.sunU) * aspect, (v - l.sunV) * 1.4);
    c = mix(c, p.glow, clamp01(1 - ds / (l.glowR ?? 0.5)) ** 2 * 0.9);
    if (l.disc) c = mix(c, p.sun, clamp01((0.07 - ds) * 60));

    const n = fbm(u * 1.6 * aspect + l.seed, v * 2.8);
    const band = Math.exp(-(((v - l.cloudV) / l.cloudW) ** 2));
    const cloud = clamp01((n * band - 0.32) * 9);
    const below = fbm(u * 1.6 * aspect + l.seed, (v + 0.04) * 2.8);
    const lit = clamp01((n - below) * 9 + (v - l.cloudV) * 2 + 0.3);
    return mix(c, mix(mix(p.cloudShade, p.cloudDeep, clamp01((n - 0.6) * 4)), p.cloudLit, lit), cloud);
  };
}

/** Brush direction in the sky: level, bending gently around the clouds. */
export function skyAngle(u: number, v: number, aspect: number, seed: number) {
  const e = 0.004;
  const gx = fbm((u + e) * 1.6 * aspect + seed, v * 2.8) - fbm((u - e) * 1.6 * aspect + seed, v * 2.8);
  const gy = fbm(u * 1.6 * aspect + seed, (v + e) * 2.8) - fbm(u * 1.6 * aspect + seed, (v - e) * 2.8);
  const contour = Math.atan(Math.tan(Math.atan2(gy, gx) + Math.PI / 2));
  return Math.hypot(gx, gy) > 0.002 ? Math.max(-0.45, Math.min(0.45, contour * 0.5)) : -0.06;
}

/** Water below `horizon`: the sky mirrored, deepening to `deep`, with the sun's path. */
export function water(skyAt: (u: number, v: number) => RGB, u: number, v: number, horizon: number, aspect: number, deep: RGB, sunU: number, glitter: RGB): RGB {
  const m = horizon - (v - horizon) * 1.2;
  let c = mix(skyAt(u, Math.max(0.02, m)), deep, 0.4 + clamp01((v - horizon) * 3) * 0.45);
  const path = Math.exp(-(((u - sunU) * aspect / (0.03 + (v - horizon) * 0.5)) ** 2));
  c = mix(c, glitter, path * 0.8 * clamp01(noise(u * 40, v * 90) * 1.6 - 0.4));
  return c;
}

/** True where (u, v) sits on the sun's path across the water. */
export const onSunPath = (u: number, v: number, horizon: number, aspect: number, sunU: number) =>
  Math.abs(u - sunU) * aspect < 0.025 + (v - horizon) * 0.45;
