// Farmland at sunset: three fields of different crops, one behind the
// other, split by fences that run across the view. The nearest fence has
// an open gate.
import { clamp01, css, dab, fbm, grain, mix, noise, paintField, prepare, type RGB } from '../engine';
import { sky, skyAngle } from '../nature';

const SEED = 12.4;
const HORIZON = 0.5;
const VP: [number, number] = [0.52, HORIZON - 0.02];
const skyAt = sky(
  {
    top: [240, 204, 178], mid: [242, 170, 150], low: [250, 196, 150],
    glow: [255, 222, 160], sun: [255, 244, 214],
    cloudShade: [118, 104, 166], cloudDeep: [90, 82, 150], cloudLit: [252, 192, 166],
  },
  { sunU: 0.52, sunV: 0.42, cloudV: 0.2, cloudW: 0.14, seed: SEED, glowR: 0.5, disc: true },
);

// Where a ground point lands on the bottom edge, following lines to the vanishing point.
const toBottom = (u: number, v: number) => VP[0] + (u - VP[0]) / clamp01((v - VP[1]) / (1 - VP[1]) + 1e-4);
// Fence lines across the view (screen height at the middle), far to near.
const FENCES = [0.6, 0.76];
const fenceV = (u: number, f: number) => f + (f - HORIZON) * 0.12 * Math.sin(u * 3 + f * 9);

type Crop = { a: RGB; b: RGB };
const CROPS: Crop[] = [
  { a: [146, 180, 120], b: [72, 112, 86] }, // meadow, far
  { a: [246, 204, 120], b: [184, 120, 62] }, // wheat
  { a: [168, 134, 206], b: [92, 70, 150] }, // lavender, near
];

const hills = (u: number) => HORIZON - 0.03 - 0.04 * Math.sin(u * 4 + 0.5) - 0.03 * fbm(u * 8, 9);

export default function paint(canvas: HTMLCanvasElement) {
  const box = prepare(canvas);
  if (!box) return;
  const { ctx, w, h, k } = box;
  const aspect = w / h;

  const r = paintField(ctx, w, h, (u, v) => {
    if (v > HORIZON) {
      const b = toBottom(u, v);
      const crop = CROPS[v < fenceV(u, FENCES[0]) ? 0 : v < fenceV(u, FENCES[1]) ? 1 : 2];
      const depth = clamp01((v - HORIZON) / (1 - HORIZON));
      // Crop rows: stripes along the lines that run to the vanishing point.
      const rows = (0.5 + 0.5 * Math.sin(b * 90)) ** 2;
      let c = mix(crop.a, crop.b, rows * (0.3 + 0.7 * depth));
      // Haze near the horizon, warm light across the far fields.
      c = mix(c, [246, 196, 166], (1 - depth) ** 3 * 0.6);
      c = mix(c, [60, 50, 90], clamp01(noise(u * 6, v * 6) - 0.55) * 0.5 * depth);
      const angle = Math.atan2((v - VP[1]) * h, (u - VP[0]) * w);
      return { c, angle, zone: 'field' };
    }
    const hi = hills(u);
    if (v > hi) return { c: mix([168, 128, 168], [214, 156, 160], clamp01((v - hi) * 20) * 0.4), angle: 0.1, zone: 'hill' };
    return { c: skyAt(u, v, aspect), angle: skyAngle(u, v, aspect, SEED), zone: 'sky' };
  }, {
    seed: 57,
    k,
    highlight: (cell, _u, v, r) =>
      (cell.zone === 'sky' && cell.c[0] + cell.c[1] + cell.c[2] > 650 && r() < 0.5) || (cell.zone === 'field' && v < HORIZON + 0.08 && r() < 0.25)
        ? css(mix(cell.c, [255, 240, 210], 0.5), 0, 0.7)
        : null,
  });

  // Fences across the view: posts and two rails, scaled by distance. The
  // near fence has a gap with its gate swung open towards the viewer.
  const GATE = [0.36, 0.44];
  for (const [fi, f] of FENCES.entries()) {
    const scale = (f - HORIZON) / (1 - HORIZON);
    const ph = h * 0.22 * scale, gap = w * 0.05 * scale;
    const near = fi === FENCES.length - 1;
    const inGate = (u: number) => near && u > GATE[0] && u < GATE[1];
    for (let x = gap / 2; x < w; x += gap) {
      const u = x / w;
      if (inGate(u) && u > GATE[0] + 0.01) continue;
      const y = fenceV(u, f) * h;
      for (let j = 0; j < 3; j++) dab(ctx, x + (r() - 0.5) * 2 * scale, y - ph / 2, ph, Math.PI / 2, Math.max(1, 4.5 * scale) * k, css([70, 52, 58], (r() - 0.5) * 16, 0.95));
      // A warm edge where the low sun catches the post.
      dab(ctx, x - 1.5 * scale * k, y - ph / 2, ph * 0.8, Math.PI / 2, Math.max(0.6, 1.6 * scale) * k, 'rgba(255,196,150,0.6)');
    }
    for (const rail of [0.35, 0.75]) {
      for (let x = 0; x < w; x += 4) {
        const u = x / w;
        if (inGate(u)) continue;
        const y = fenceV(u, f) * h - ph * rail;
        const dy = (fenceV((x + 4) / w, f) - fenceV(u, f)) * h;
        dab(ctx, x, y, 6 * k, Math.atan2(dy, 4), Math.max(0.8, 2.8 * scale) * k, 'rgba(80,58,62,0.9)');
      }
    }
    if (near) {
      // The gate, hinged on the left post and swung out towards the viewer.
      const hx = GATE[0] * w, hy = fenceV(GATE[0], f) * h;
      const gw = (GATE[1] - GATE[0]) * w * 0.8, drop = ph * 0.45;
      for (const yy of [0.2, 0.55, 0.88]) {
        for (let s2 = 0; s2 < 1; s2 += 0.05) dab(ctx, hx + gw * s2 * 0.75, hy - ph * yy + drop * s2, 5 * k, Math.atan2(drop, gw * 0.75), 2.4 * k, 'rgba(84,60,60,0.95)');
      }
      for (let s2 = 0; s2 < 1; s2 += 0.06) dab(ctx, hx + gw * 0.75 * s2, hy - ph * 0.88 + (ph * 0.68 + drop) * s2, 5 * k, Math.atan2(ph * 0.68 + drop, gw * 0.75), 2 * k, 'rgba(84,60,60,0.9)');
      for (let j = 0; j < 4; j++) dab(ctx, hx + gw * 0.75, hy - ph * 0.5 + drop, ph * 0.75, Math.PI / 2, 3 * k, 'rgba(70,52,58,0.95)');
    }
  }

  // Birds.
  ctx.strokeStyle = 'rgba(80,64,100,0.7)';
  ctx.lineWidth = 1.2 * k;
  for (let i = 0; i < 6; i++) {
    const x = w * (0.6 + r() * 0.25), y = h * (0.1 + r() * 0.15), s = (3 + r() * 4) * k;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.35);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.5, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.5, x + s, y - s * 0.35);
    ctx.stroke();
  }

  grain(ctx, w, h, r);
}
