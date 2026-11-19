// Oil-painting engine shared by the landscape and the post paintings.
// A scene is a colour field: for any point it returns a colour and the
// direction a brush would follow there. The engine paints it in layers
// (underpainting, broad, medium and fine strokes, highlights, grain) and
// hands back the seeded random source so scenes can add details on top.

export type RGB = [number, number, number];

export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

// Smooth value noise on a lattice, summed over a few octaves.
const lattice = (() => {
  const r = rng(11);
  return Array.from({ length: 512 }, () => r());
})();
const hash = (x: number, y: number) => lattice[((x * 73) ^ (y * 151)) & 511];
const smooth = (t: number) => t * t * (3 - 2 * t);
export function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x: number, y: number) =>
  noise(x, y) * 0.5 + noise(x * 2.03, y * 2.03) * 0.27 + noise(x * 4.1, y * 4.1) * 0.15 + noise(x * 8.3, y * 8.3) * 0.08;

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** CSS colour with a brightness jitter `j` (blue moves less, so tints stay warm). */
export const css = (c: RGB, j: number, a: number) =>
  `rgba(${Math.round(c[0] + j)},${Math.round(c[1] + j)},${Math.round(c[2] + j * 0.7)},${a})`;

export type Cell = {
  c: RGB;
  /** Brush direction in radians. */
  angle: number;
  zone: string;
  /** Calm surfaces (water) get long, level strokes. */
  calm?: boolean;
};

export type Field = (u: number, v: number) => Cell;

export type PaintOptions = {
  seed: number;
  /** Brush scale; 1 suits a canvas about 1400px wide. */
  k: number;
  /** Optional impasto: return a colour to dab a highlight at this point. */
  highlight?: (cell: Cell, u: number, v: number, r: () => number) => string | null;
};

/** One short, slightly bowed brush stroke. */
export function dab(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, width: number, colour: string, bow = 0) {
  const dx = (Math.cos(angle) * len) / 2, dy = (Math.sin(angle) * len) / 2;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.quadraticCurveTo(x + bow, y + bow, x + dx, y + dy);
  ctx.stroke();
}

/** Paints `field` over the whole canvas and returns the random source for details. */
export function paintField(ctx: CanvasRenderingContext2D, w: number, h: number, field: Field, o: PaintOptions) {
  const r = rng(o.seed);
  const { k } = o;
  ctx.lineCap = 'round';

  // 1. Underpainting in small blocks.
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = css(field(x / w, y / h).c, 0, 1);
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // 2-4. Broad, medium and fine strokes, each following the local direction.
  const passes = [
    { density: 70, width: [4, 7], len: [18, 34], jitter: 30, alpha: [0.55, 0.85] },
    { density: 26, width: [2, 4], len: [9, 20], jitter: 44, alpha: [0.6, 0.95] },
    { density: 50, width: [1, 2], len: [4, 10], jitter: 60, alpha: [0.5, 0.9] },
  ];
  for (const p of passes) {
    const count = Math.round((w * h) / p.density);
    for (let i = 0; i < count; i++) {
      const x = r() * w, y = r() * h;
      const cell = field(x / w, y / h);
      const angle = cell.angle + (r() - 0.5) * (cell.calm ? 0.08 : 0.45);
      const len = (p.len[0] + r() * (p.len[1] - p.len[0])) * k * (cell.calm ? 1.5 : 1);
      const colour = css(cell.c, (r() - 0.5) * p.jitter, p.alpha[0] + r() * (p.alpha[1] - p.alpha[0]));
      dab(ctx, x, y, len, angle, (p.width[0] + r() * (p.width[1] - p.width[0])) * k, colour, (r() - 0.5) * 3);
    }
  }

  // 5. Highlights where the scene asks for them.
  if (o.highlight) {
    for (let i = 0; i < (w * h) / 120; i++) {
      const x = r() * w, y = r() * h;
      const cell = field(x / w, y / h);
      const colour = o.highlight(cell, x / w, y / h, r);
      if (!colour) continue;
      dab(ctx, x, y, (4 + r() * 10) * k, cell.calm ? 0 : (r() - 0.5) * 0.4, (1 + r() * 2) * k, colour);
    }
  }
  return r;
}

/** Canvas grain: tiny specks of light and dark. Call last. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) {
  for (let i = 0; i < (w * h) / 40; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,250,240,0.22)' : 'rgba(20,24,60,0.16)';
    ctx.fillRect(r() * w, r() * h, 1, 1);
  }
}

/** Sizes the canvas to its box at device resolution; null if it has no size. */
export function prepare(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return null;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  return { ctx, w, h, k: Math.max(0.7, Math.min(1.2, w / 1400)) };
}

const media = matchMedia('(prefers-color-scheme: dark)');
export const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : media.matches;
};

/** Paints now, then again when the width or the theme changes. */
export function keepPainted(canvas: HTMLCanvasElement, paint: () => void, onTheme = true) {
  paint();
  let lastW = canvas.clientWidth;
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      // Mobile URL bars change height on scroll; only repaint on width changes.
      if (canvas.clientWidth !== lastW) { lastW = canvas.clientWidth; paint(); }
    }, 150);
  });
  if (onTheme) {
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    media.addEventListener('change', paint);
  }
}
