// A string of paper lanterns at dusk. All are lit but one: something is
// different about that one, and it is worth finding out what.
import { clamp01, css, dab, fbm, grain, mix, paintField, prepare, type RGB } from '../engine';
import { sky, skyAngle } from '../nature';

const SEED = 3.7;
const skyAt = sky(
  {
    top: [246, 206, 172], mid: [234, 150, 150], low: [150, 112, 172],
    glow: [255, 214, 150], sun: [255, 240, 200],
    cloudShade: [110, 102, 172], cloudDeep: [80, 78, 150], cloudLit: [250, 186, 164],
  },
  { sunU: 0.8, sunV: 0.78, cloudV: 0.2, cloudW: 0.16, seed: SEED, glowR: 0.6 },
);

const hills = (u: number) => 0.7 - 0.05 * Math.sin(u * 5 + 1) - 0.04 * fbm(u * 6, 2);
const hedge = (u: number) => 0.86 - 0.03 * Math.sin(u * 7) - 0.04 * fbm(u * 14, 5);

const EDGE: RGB = [212, 92, 56];
const CORE: RGB = [255, 218, 132];
const DARK_EDGE: RGB = [70, 56, 86];
const DARK_CORE: RGB = [126, 102, 132];
const CORD = 'rgba(58,44,70,0.9)';

export default function paint(canvas: HTMLCanvasElement) {
  const box = prepare(canvas);
  if (!box) return;
  const { ctx, w, h, k } = box;
  const aspect = w / h;

  const r = paintField(ctx, w, h, (u, v) => {
    const he = hedge(u);
    if (v > he) return { c: mix([44, 46, 86], [26, 30, 60], clamp01((v - he) * 5)), angle: -0.5, zone: 'hedge' };
    const hi = hills(u);
    if (v > hi) return { c: mix([128, 104, 160], [92, 80, 140], clamp01((v - hi) * 6)), angle: Math.sin(u * 5 + 1) * 0.2, zone: 'hill' };
    return { c: skyAt(u, v, aspect), angle: skyAngle(u, v, aspect, SEED), zone: 'sky' };
  }, {
    seed: 21,
    k,
    highlight: (cell, _u, _v, r) =>
      cell.zone === 'sky' && cell.c[0] + cell.c[1] + cell.c[2] > 640 && r() < 0.5 ? css(mix(cell.c, [255, 246, 222], 0.5), 0, 0.7) : null,
  });

  // The cord, sagging between two posts off the edges.
  const cordY = (x: number) => h * (0.12 + 0.2 * (1 - ((x / w) * 2 - 1) ** 2));
  for (let x = -4; x < w + 4; x += 3) dab(ctx, x, cordY(x), 5 * k, Math.atan2(cordY(x + 2) - cordY(x - 2), 4), 1.6 * k, CORD);

  const n = 7, out = 4;
  const rx = h * 0.06, ry = h * 0.082;
  for (let i = 0; i < n; i++) {
    const x = w * (0.08 + (i * 0.84) / (n - 1));
    const top = cordY(x);
    const cy = top + h * (0.08 + (i % 2) * 0.06) + ry;
    const lit = i !== out;

    // Hanging thread.
    for (let y = top; y < cy - ry; y += 3) dab(ctx, x, y, 4 * k, Math.PI / 2, 1.2 * k, CORD);

    if (lit) {
      // Glow, laid on as a soft wash and then a ring of warm dabs.
      const g = ctx.createRadialGradient(x, cy, ry * 0.5, x, cy, ry * 3.4);
      g.addColorStop(0, 'rgba(255,220,150,0.8)');
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - ry * 3.4, cy - ry * 3.4, ry * 6.8, ry * 6.8);
      for (let j = 0; j < 140; j++) {
        const a = r() * Math.PI * 2, d = ry * (1.1 + r() * 2);
        dab(ctx, x + Math.cos(a) * d, cy + Math.sin(a) * d, (4 + r() * 6) * k, a + Math.PI / 2, (1.5 + r() * 2) * k,
          `rgba(255,${200 + r() * 30 | 0},${130 + r() * 40 | 0},${0.25 * (1 - (d / ry - 1.1) / 2)})`);
      }
    }

    // Body: strokes along the paper's meridians, bright at the core,
    // deeper at the edges, kept inside the lantern's outline.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = css(lit ? mix(EDGE, CORE, 0.5) : mix(DARK_EDGE, DARK_CORE, 0.4), 0, 1);
    ctx.fillRect(x - rx, cy - ry, rx * 2, ry * 2);
    for (let j = 0; j < 320; j++) {
      const t = r() * 2 - 1, s = r() * 2 - 1;
      if (t * t + s * s > 1) continue;
      const shade = 1 - Math.abs(t) ** 1.4;
      const c = lit ? mix(EDGE, CORE, shade * (0.75 + 0.25 * (1 - Math.abs(s)))) : mix(DARK_EDGE, DARK_CORE, shade * 0.8);
      dab(ctx, x + t * rx, cy + s * ry, (3 + r() * 5) * k, Math.PI / 2 - t * s * 0.9, (1.6 + r() * 1.6) * k, css(c, (r() - 0.5) * 20, 0.9));
    }
    // Ribs.
    for (const t of [-0.55, 0, 0.55]) {
      for (let s = -0.92; s <= 0.92; s += 0.08) {
        const xx = x + t * rx * Math.sqrt(1 - s * s);
        dab(ctx, xx, cy + s * ry, 3 * k, Math.PI / 2 - t * s * 0.9, 0.9 * k, lit ? 'rgba(170,70,40,0.55)' : 'rgba(40,30,56,0.6)');
      }
    }
    ctx.restore();
    // Caps.
    for (const [yy, ww] of [[cy - ry, rx * 0.55], [cy + ry, rx * 0.4]] as const) {
      for (let j = 0; j < 10; j++) dab(ctx, x + (r() - 0.5) * ww * 1.6, yy + (r() - 0.5) * 3 * k, ww * 0.6, (r() - 0.5) * 0.2, 2.4 * k, 'rgba(46,34,58,0.95)');
    }

    if (!lit) {
      // A thin wisp of smoke where the flame was.
      for (let t = 0; t < 1; t += 0.02) {
        const yy = cy - ry - t * h * 0.22;
        const xx = x + Math.sin(t * 9) * rx * 0.5 * t;
        dab(ctx, xx, yy, 4 * k, -Math.PI / 2 + Math.cos(t * 9) * 0.6, (1.4 - t) * 1.6 * k, `rgba(236,226,240,${0.55 * (1 - t)})`);
      }
    }
  }

  // Fireflies over the hedge.
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = h * (0.62 + r() * 0.3);
    ctx.fillStyle = `rgba(255,232,150,${0.5 + r() * 0.5})`;
    ctx.beginPath();
    ctx.arc(x, y, (1 + r() * 1.2) * k, 0, Math.PI * 2);
    ctx.fill();
  }

  grain(ctx, w, h, r);
}
