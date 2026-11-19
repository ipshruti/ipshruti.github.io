// A lighthouse at dusk, its beam fixed on a small boat. The shore, the
// light and the weather change; the beam still finds the boat.
import { clamp01, css, dab, fbm, grain, mix, noise, paintField, prepare, type RGB } from '../engine';
import { onSunPath, sky, skyAngle, water } from '../nature';

const SEED = 8.1;
const HORIZON = 0.64;
const SUN_U = 0.88;
const skyAt = sky(
  {
    top: [232, 196, 182], mid: [214, 150, 162], low: [176, 128, 170],
    glow: [252, 206, 150], sun: [255, 240, 200],
    cloudShade: [104, 98, 164], cloudDeep: [74, 72, 140], cloudLit: [244, 178, 166],
  },
  { sunU: SUN_U, sunV: 0.66, cloudV: 0.24, cloudW: 0.18, seed: SEED, glowR: 0.45 },
);

// Headland on the left, rising to a cliff where the lighthouse stands.
const rock = (u: number) => {
  const cliff = 0.46 + 0.05 * fbm(u * 10, 3);
  // Past the cliff the headland falls away to the sea, down to the bottom edge.
  const slope = cliff + clamp01((u - 0.26) / 0.3) ** 1.4 * (1.05 - cliff);
  return u < 0.26 ? cliff : slope;
};

const TOWER_U = 0.16;
const BOAT: [number, number] = [0.72, 0.74];

export default function paint(canvas: HTMLCanvasElement) {
  const box = prepare(canvas);
  if (!box) return;
  const { ctx, w, h, k } = box;
  const aspect = w / h;
  const lamp: [number, number] = [TOWER_U, rock(TOWER_U) - 0.3];
  // Beam direction in pixels, from the lamp to the boat.
  const beamA = Math.atan2((BOAT[1] - lamp[1]) * h, (BOAT[0] - lamp[0]) * w);
  const beam = (u: number, v: number) => {
    const dx = (u - lamp[0]) * w, dy = (v - lamp[1]) * h;
    if (dx <= 0) return 0;
    const d = Math.hypot(dx, dy);
    const off = Math.abs(Math.atan2(dy, dx) - beamA);
    return Math.exp(-((off / (0.012 + 14 / Math.max(d, 1))) ** 2)) * clamp01(1.1 - d / (w * 0.75));
  };
  const BEAM: RGB = [255, 234, 180];
  const skyCol = (u: number, v: number) => skyAt(u, v, aspect);

  const r = paintField(ctx, w, h, (u, v) => {
    if (v > rock(u)) {
      const face = clamp01(1 - (v - rock(u)) * 5);
      const c = mix(mix([62, 52, 88], [34, 32, 62], clamp01((v - rock(u)) * 3)), [182, 120, 130], face * 0.45 * clamp01(noise(u * 30, v * 20) * 1.5 - 0.2));
      return { c, angle: 1.1 + (noise(u * 40, v * 40) - 0.5) * 0.8, zone: 'rock' };
    }
    if (v > HORIZON) {
      let c = water(skyCol, u, v, HORIZON, aspect, [52, 62, 118], SUN_U, [252, 214, 150]);
      c = mix(c, BEAM, beam(u, v) * 0.5);
      return { c, angle: 0, zone: 'water', calm: true };
    }
    let c = skyCol(u, v);
    // Sea mist along the horizon.
    c = mix(c, [226, 190, 196], Math.exp(-(((v - HORIZON + 0.02) / 0.03) ** 2)) * 0.5);
    c = mix(c, BEAM, beam(u, v) * 0.75);
    return { c, angle: skyAngle(u, v, aspect, SEED), zone: 'sky' };
  }, {
    seed: 33,
    k,
    highlight: (cell, u, v, r) => {
      if (cell.zone === 'sky' && beam(u, v) > 0.5 && r() < 0.6) return css(BEAM, 0, 0.6);
      if (cell.zone === 'water' && (onSunPath(u, v, HORIZON, aspect, SUN_U) || beam(u, v) > 0.4) && r() < 0.5) return css([255, 240, 206], 0, 0.6);
      return null;
    },
  });

  // Tower: tapering, white with two red bands, shaded away from the sunset.
  const base = rock(TOWER_U) * h + 2, top = lamp[1] * h + h * 0.05;
  const half = (y: number) => (h * 0.035) * (0.7 + 0.3 * (y - top) / (base - top));
  const cx = TOWER_U * w;
  for (let y = top; y < base; y += 1.5) {
    const t = (y - top) / (base - top);
    const band = (t > 0.28 && t < 0.42) || (t > 0.66 && t < 0.8);
    for (let j = 0; j < 4; j++) {
      const s = r() * 2 - 1;
      const lightSide = clamp01(0.5 + s * 0.6);
      const c: RGB = band ? mix([150, 56, 64], [214, 96, 92], lightSide) : mix([150, 140, 164], [246, 236, 226], lightSide);
      dab(ctx, cx + s * half(y), y, 3 * k, Math.PI / 2, 2 * k, css(c, (r() - 0.5) * 16, 0.95));
    }
  }
  // Surf where the headland meets the water.
  for (let j = 0; j < 260; j++) {
    const u = 0.3 + r() * 0.3, edge = rock(u);
    if (edge < HORIZON || edge > 1) continue;
    dab(ctx, u * w + (r() - 0.2) * 10 * k, edge * h + (r() - 0.5) * 4 * k, (4 + r() * 8) * k, 0.4, 1.6 * k, `rgba(250,236,232,${0.4 + r() * 0.4})`);
  }

  // Gallery, lamp room and roof.
  const ly = lamp[1] * h;
  for (let j = 0; j < 14; j++) dab(ctx, cx + (r() - 0.5) * h * 0.08, top, 5 * k, 0, 2.2 * k, 'rgba(40,32,52,0.95)');
  const g = ctx.createRadialGradient(cx, ly, 0, cx, ly, h * 0.12);
  g.addColorStop(0, 'rgba(255,240,190,0.95)');
  g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - h * 0.12, ly - h * 0.12, h * 0.24, h * 0.24);
  for (let j = 0; j < 30; j++) dab(ctx, cx + (r() - 0.5) * h * 0.04, ly + (r() - 0.5) * h * 0.05, 3 * k, Math.PI / 2, 2 * k, css([255, 236, 170], 0, 0.95));
  // Conical roof above the lamp.
  for (let j = 0; j < 40; j++) {
    const t = r(), s = r() * 2 - 1;
    dab(ctx, cx + s * (1 - t) * h * 0.035, ly - h * 0.035 - t * h * 0.04, 2.5 * k, Math.PI / 2, 1.8 * k, 'rgba(46,34,58,0.95)');
  }

  // The boat: dark hull, sail lit by the beam, a short reflection.
  const bx = BOAT[0] * w, by = BOAT[1] * h, bs = h * 0.07;
  for (let j = 0; j < 40; j++) {
    const t = r() * 2 - 1;
    dab(ctx, bx + t * bs * (0.9 - 0.2 * Math.abs(t)), by + r() * bs * 0.18, 4 * k, 0, 2 * k, 'rgba(40,34,60,0.95)');
  }
  for (let j = 0; j < 60; j++) {
    const t = r(), s = r();
    dab(ctx, bx - bs * 0.1 + s * t * bs * 0.6, by - bs * 0.1 - (1 - t) * bs * 1.1, 3 * k, -1.2, 1.8 * k, css(mix([236, 214, 196], [255, 244, 214], s), 0, 0.95));
  }
  for (let j = 0; j < 12; j++) dab(ctx, bx + (r() - 0.5) * bs, by + bs * 0.3 + r() * bs * 0.5, (5 + r() * 6) * k, 0, 1.4 * k, 'rgba(255,236,200,0.5)');

  grain(ctx, w, h, r);
}

