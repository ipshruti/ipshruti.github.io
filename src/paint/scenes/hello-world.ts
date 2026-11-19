// Sunrise over open sea, a small sailboat setting out: a first post.
import { css, dab, grain, mix, paintField, prepare, type RGB } from '../engine';
import { onSunPath, sky, skyAngle, water } from '../nature';

const SEED = 1.9;
const HORIZON = 0.62;
const SUN_U = 0.34;
const skyAt = sky(
  {
    top: [150, 182, 224], mid: [246, 196, 176], low: [252, 200, 150],
    glow: [255, 226, 160], sun: [255, 246, 222],
    cloudShade: [150, 150, 196], cloudDeep: [122, 124, 180], cloudLit: [255, 214, 186],
  },
  { sunU: SUN_U, sunV: HORIZON - 0.03, cloudV: 0.3, cloudW: 0.14, seed: SEED, glowR: 0.55, disc: true },
);

const BOAT: [number, number] = [0.68, 0.7];

export default function paint(canvas: HTMLCanvasElement) {
  const box = prepare(canvas);
  if (!box) return;
  const { ctx, w, h, k } = box;
  const aspect = w / h;
  const skyCol = (u: number, v: number) => skyAt(u, v, aspect);

  const r = paintField(ctx, w, h, (u, v) => {
    if (v > HORIZON) {
      const c = water(skyCol, u, v, HORIZON, aspect, [86, 116, 160], SUN_U, [255, 226, 160]);
      return { c, angle: 0, zone: 'water', calm: true };
    }
    let c = skyCol(u, v);
    c = mix(c, [255, 230, 200], Math.exp(-(((v - HORIZON + 0.015) / 0.02) ** 2)) * 0.5);
    return { c, angle: skyAngle(u, v, aspect, SEED), zone: 'sky' };
  }, {
    seed: 77,
    k,
    highlight: (cell, u, v, r) => {
      if (cell.zone === 'sky' && cell.c[0] + cell.c[1] + cell.c[2] > 660 && r() < 0.5) return css(mix(cell.c, [255, 248, 230], 0.5), 0, 0.7);
      if (cell.zone === 'water' && onSunPath(u, v, HORIZON, aspect, SUN_U) && r() < 0.6) return css([255, 244, 214], 0, 0.5 + r() * 0.4);
      return null;
    },
  });

  // Sailboat: dark hull, mainsail and jib catching the sunrise, a broken reflection.
  const bx = BOAT[0] * w, by = BOAT[1] * h, bs = h * 0.09;
  for (let j = 0; j < 50; j++) {
    const t = r() * 2 - 1;
    dab(ctx, bx + t * bs * (1 - 0.25 * Math.abs(t)), by + r() * bs * 0.16, 4 * k, 0.04, 2 * k, 'rgba(50,46,78,0.95)');
  }
  for (let j = 0; j < 10; j++) dab(ctx, bx, by - bs * (0.1 + r() * 1.2), 3 * k, Math.PI / 2, 1.3 * k, 'rgba(60,50,80,0.95)');
  const sail = (x0: number, w0: number, hgt: number, light: RGB) => {
    for (let j = 0; j < 90; j++) {
      const t = r(), s = r();
      dab(ctx, x0 + s * (1 - t) * w0, by - bs * 0.15 - t * hgt, 3 * k, -1.35, 1.8 * k, css(mix([226, 200, 196], light, 1 - s), (r() - 0.5) * 10, 0.95));
    }
  };
  sail(bx - bs * 0.05, -bs * 0.75, bs * 1.25, [255, 236, 206]);
  sail(bx + bs * 0.05, bs * 0.6, bs * 1.05, [255, 226, 190]);
  for (let j = 0; j < 16; j++) {
    const yy = by + bs * 0.3 + r() * bs * 0.9;
    dab(ctx, bx + (r() - 0.5) * bs * 0.9, yy, (5 + r() * 8) * k, 0, 1.4 * k, `rgba(250,226,206,${0.35 * (1 - (yy - by) / (bs * 1.3))})`);
  }

  // Gulls.
  ctx.strokeStyle = 'rgba(90,86,120,0.75)';
  ctx.lineWidth = 1.3 * k;
  for (let i = 0; i < 4; i++) {
    const x = w * (0.5 + r() * 0.3), y = h * (0.12 + r() * 0.2), s = (4 + r() * 4) * k;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.35);
    ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.5, x, y);
    ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.5, x + s, y - s * 0.35);
    ctx.stroke();
  }

  grain(ctx, w, h, r);
}
