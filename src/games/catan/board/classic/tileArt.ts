import type { ResourceType } from '../../types';
import { S, W, circle, ellipse, hashStr, hexPath, hex2rgb, lerp, makeNoise, mulberry32, pick, shade } from './art';
import type { Rng } from './art';

/**
 * Procedurally painted terrain tiles: a noise-shaded base, then hand-placed details per terrain
 * (trees, sheep and a barn, wheat plots, a clay pit, peaks, dunes), a soft vignette and a feathered edge so the
 * cream tile rim shows through. Drawn once into a bitmap per terrain/variant and reused — nothing is animated.
 */
const PALETTE: Record<ResourceType, [string, string]> = {
  pasture: ['#a9d652', '#5a9c28'],
  fields: ['#f4cf50', '#c58a18'],
  forest: ['#3f8d3b', '#1b5024'],
  hills: ['#e07f3e', '#8c3716'],
  mountains: ['#b8b4d0', '#686586'],
  desert: ['#f2dfae', '#c7a367'],
};

type Ctx = CanvasRenderingContext2D;

function paintPasture(g: Ctx, r: Rng) {
  for (let i = 0; i < 18; i++) {
    const x = r() * W;
    const y = r() * 2 * S;
    const rad = 8 + r() * 16;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5;
    gr.addColorStop(0, dark ? 'rgba(40,110,30,.30)' : 'rgba(210,248,120,.34)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const flip = r() < 0.5 ? 1 : -1;
  const X = (x: number) => (flip > 0 ? x : W - x);
  const pts: [number, number][] = (
    [
      [-8, S * 1.75],
      [W * 0.22, S * 1.5],
      [W * 0.36, S * 1.15],
      [W * 0.44, S * 0.9],
      [W * 0.62, S * 0.6],
      [W * 0.58, S * 0.25],
      [W * 0.64, -8],
    ] as [number, number][]
  ).map(([x, y]) => [X(x), y]);
  const drawPath = (width: number, color: string) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    g.lineWidth = width;
    g.lineCap = 'round';
    g.strokeStyle = color;
    g.stroke();
  };
  drawPath(6.5, 'rgba(110,70,35,.75)');
  drawPath(4.2, '#c99a5e');
  drawPath(1.6, 'rgba(250,222,160,.6)');
  const bx = X(W * 0.7);
  const by = S * 1.02;
  g.fillStyle = 'rgba(0,0,0,.25)';
  ellipse(g, bx + 2, by + 9, 12, 4);
  g.fillStyle = '#8d5a2d';
  g.fillRect(bx - 8, by - 3, 16, 10);
  g.fillStyle = '#6b3f1d';
  g.beginPath();
  g.moveTo(bx - 10, by - 3);
  g.lineTo(bx, by - 11);
  g.lineTo(bx + 10, by - 3);
  g.closePath();
  g.fill();
  g.fillStyle = '#a8733a';
  g.fillRect(bx - 3, by + 1, 4, 6);
  g.fillStyle = '#7a4d26';
  g.fillRect(bx - 14, by, 6, 7);
  g.fillStyle = '#5c3818';
  g.fillRect(bx - 15, by - 3, 8, 3);
  [
    [-17, -6],
    [17, -4],
    [20, 6],
  ].forEach(([dx, dy]) => {
    g.fillStyle = '#2f6f2a';
    circle(g, bx + dx, by + dy, 5.4);
    g.fillStyle = 'rgba(150,220,110,.5)';
    circle(g, bx + dx - 1.5, by + dy - 2, 2.6);
  });
  for (let i = 0; i < 22; i++) {
    const x = 6 + r() * (W - 12);
    const y = 8 + r() * (2 * S - 16);
    if (i < 13) {
      g.fillStyle = 'rgba(0,0,0,.22)';
      ellipse(g, x + 0.8, y + 2, 2.8, 1.1);
      g.fillStyle = '#f6f6f2';
      ellipse(g, x, y, 2.7, 2);
      g.fillStyle = '#3a3a3a';
      circle(g, x + 2.3, y - 0.4, 0.95);
    } else {
      g.fillStyle = pick(r, ['#2e7a2c', '#3f9438', '#26682a']);
      circle(g, x, y, 2.4 + r() * 2.2);
      g.fillStyle = 'rgba(170,230,120,.4)';
      circle(g, x - 0.8, y - 1, 1.2);
    }
  }
}

function paintFields(g: Ctx, r: Rng) {
  const patches = [
    { x: W * 0.3, y: S * 0.66, w: 36, h: 24, a: -0.38 },
    { x: W * 0.7, y: S * 0.58, w: 32, h: 26, a: 0.32 },
    { x: W * 0.4, y: S * 1.38, w: 44, h: 24, a: 0.12 },
    { x: W * 0.76, y: S * 1.3, w: 30, h: 22, a: -0.26 },
  ];
  patches.forEach((p) => {
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.a + (r() - 0.5) * 0.2);
    g.beginPath();
    g.rect(-p.w / 2, -p.h / 2, p.w, p.h);
    g.save();
    g.clip();
    g.fillStyle = '#d49a1c';
    g.fillRect(-p.w, -p.h, p.w * 2, p.h * 2);
    const cols = ['#f0c23c', '#dba526', '#f7d462', '#c88f18'];
    for (let x = -p.w / 2, k = 0; x < p.w / 2; x += 2.6, k++) {
      g.fillStyle = cols[k % 4];
      g.fillRect(x, -p.h / 2, 1.8, p.h);
    }
    const gr = g.createLinearGradient(0, -p.h / 2, 0, p.h / 2);
    gr.addColorStop(0, 'rgba(255,240,170,.4)');
    gr.addColorStop(1, 'rgba(90,50,0,.28)');
    g.fillStyle = gr;
    g.fillRect(-p.w, -p.h, p.w * 2, p.h * 2);
    g.restore();
    g.lineWidth = 0.9;
    g.strokeStyle = 'rgba(110,70,10,.55)';
    g.stroke();
    g.restore();
  });
  for (let i = 0; i < 3; i++) {
    const x = W * (0.2 + r() * 0.6);
    const y = S * (0.5 + r() * 1.0);
    g.fillStyle = 'rgba(0,0,0,.22)';
    ellipse(g, x + 1, y + 3, 4.2, 1.6);
    g.fillStyle = '#e9c05a';
    circle(g, x, y, 3.6);
    g.strokeStyle = '#a8761d';
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(x, y, 2.2, 0, 5);
    g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const x = 6 + r() * (W - 12);
    const y = 8 + r() * (2 * S - 16);
    g.fillStyle = 'rgba(30,90,30,.9)';
    circle(g, x, y, 2.4 + r() * 1.4);
    g.fillStyle = 'rgba(150,220,110,.5)';
    circle(g, x - 0.7, y - 0.9, 1.1);
  }
}

function paintForest(g: Ctx, r: Rng) {
  const greens = ['#2f7d32', '#3d9440', '#256b2b', '#4aa047', '#1f5a26', '#357f35'];
  const trees: { x: number; y: number; r: number; c: string }[] = [];
  for (let i = 0; i < 78; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * 58;
    trees.push({
      x: W / 2 + Math.cos(a) * rr * 0.97,
      y: S + Math.sin(a) * rr,
      r: 6 + r() * 5.2,
      c: r() < 0.07 ? pick(r, ['#c97a2b', '#d9983a']) : pick(r, greens),
    });
  }
  trees.sort((a, b) => a.y - b.y);
  trees.forEach((t) => {
    g.fillStyle = 'rgba(8,36,14,.38)';
    ellipse(g, t.x + 2.6, t.y + t.r * 0.75, t.r * 1.05, t.r * 0.5);
    const gr = g.createRadialGradient(t.x - t.r * 0.35, t.y - t.r * 0.45, t.r * 0.1, t.x, t.y, t.r * 1.05);
    gr.addColorStop(0, shade(t.c, 0.38));
    gr.addColorStop(0.55, t.c);
    gr.addColorStop(1, shade(t.c, -0.4));
    g.fillStyle = gr;
    circle(g, t.x, t.y, t.r);
    for (let k = 0; k < 7; k++) {
      const a = r() * 6.28;
      const d = r() * t.r * 0.8;
      g.fillStyle = r() < 0.5 ? 'rgba(190,240,140,.35)' : 'rgba(10,50,20,.3)';
      circle(g, t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 0.9 + r() * 1.2);
    }
  });
}

function paintHills(g: Ctx, r: Rng) {
  for (let i = 0; i < 14; i++) {
    const y0 = r() * 125 - 8;
    g.beginPath();
    for (let x = -6; x <= W + 6; x += 4) {
      const y = y0 + Math.sin(x / (13 + (i % 4) * 3) + i) * 5 + x * 0.14;
      if (x === -6) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.lineWidth = 2 + r() * 5.5;
    g.strokeStyle = r() < 0.5 ? 'rgba(80,22,8,.30)' : 'rgba(255,176,120,.22)';
    g.stroke();
  }
  const cx = W * (0.38 + r() * 0.12);
  const cy = S * 1.02;
  g.fillStyle = 'rgba(0,0,0,.25)';
  ellipse(g, cx + 2, cy + 5, 26, 14);
  const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 24);
  gr.addColorStop(0, '#2a0d06');
  gr.addColorStop(0.6, '#5e2410');
  gr.addColorStop(1, '#a2491f');
  g.fillStyle = gr;
  ellipse(g, cx, cy, 24, 13);
  g.strokeStyle = 'rgba(255,190,130,.7)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.ellipse(cx, cy, 24, 13, 0, Math.PI * 0.9, Math.PI * 2.1);
  g.stroke();
  g.strokeStyle = '#4d2f14';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(cx - 8, cy - 14);
  g.lineTo(cx - 8, cy + 2);
  g.moveTo(cx + 4, cy - 14);
  g.lineTo(cx + 4, cy + 2);
  g.moveTo(cx - 10, cy - 10);
  g.lineTo(cx + 6, cy - 10);
  g.moveTo(cx - 10, cy - 5);
  g.lineTo(cx + 6, cy - 5);
  g.stroke();
  g.fillStyle = '#7a5128';
  g.fillRect(cx + 12, cy + 13, 10, 5);
  g.fillStyle = '#2b1c0d';
  circle(g, cx + 14, cy + 19, 2);
  circle(g, cx + 20, cy + 19, 2);
  g.fillStyle = '#e7e0d2';
  ellipse(g, cx + 27, cy + 15, 3, 2);
  g.fillStyle = '#2b1c0d';
  circle(g, cx - 22, cy + 8, 1.5);
  circle(g, cx - 27, cy + 11, 1.5);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(60,20,8,.5)';
    circle(g, r() * W, r() * 2 * S, 1 + r() * 1.6);
  }
}

function peak(g: Ctx, x: number, base: number, w: number, h: number, r: Rng, snow: boolean) {
  const top: [number, number] = [x + (r() - 0.5) * w * 0.18, base - h];
  const side = (dir: number, c1: string, c2: string) => {
    g.beginPath();
    g.moveTo(top[0], top[1]);
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      g.lineTo(lerp(top[0], x + (dir * w) / 2, t) + (r() - 0.5) * w * 0.08 * (i < steps ? 1 : 0), lerp(top[1], base, t) + (r() - 0.5) * 3);
    }
    g.lineTo(x, base);
    g.closePath();
    const gr = g.createLinearGradient(top[0], top[1], x + (dir * w) / 2, base);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    g.fillStyle = gr;
    g.fill();
  };
  side(-1, '#e8e2ea', '#8e88a8');
  side(1, '#6d6a8a', '#2f2d4a');
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 0.7;
  for (let i = 0; i < 5; i++) {
    const t = 0.2 + r() * 0.7;
    g.beginPath();
    g.moveTo(lerp(top[0], x - w / 2, t * 0.9), lerp(top[1], base, t));
    g.lineTo(lerp(top[0], x - w / 2, t * 0.9) + 3 + r() * 5, lerp(top[1], base, t) + 5 + r() * 8);
    g.stroke();
  }
  g.strokeStyle = 'rgba(15,12,35,.4)';
  for (let i = 0; i < 5; i++) {
    const t = 0.25 + r() * 0.65;
    g.beginPath();
    g.moveTo(lerp(top[0], x + w / 2, t * 0.9), lerp(top[1], base, t));
    g.lineTo(lerp(top[0], x + w / 2, t * 0.9) - 2 - r() * 5, lerp(top[1], base, t) + 5 + r() * 8);
    g.stroke();
  }
  if (snow) {
    g.fillStyle = 'rgba(255,255,255,.93)';
    g.beginPath();
    g.moveTo(top[0], top[1]);
    g.lineTo(top[0] - w * 0.16, top[1] + h * 0.26);
    g.lineTo(top[0] - w * 0.07, top[1] + h * 0.21);
    g.lineTo(top[0] - w * 0.02, top[1] + h * 0.3);
    g.lineTo(top[0] + w * 0.05, top[1] + h * 0.22);
    g.lineTo(top[0] + w * 0.17, top[1] + h * 0.28);
    g.closePath();
    g.fill();
  }
}

function paintMountains(g: Ctx, r: Rng) {
  const haze = g.createLinearGradient(0, 0, 0, 2 * S);
  haze.addColorStop(0, 'rgba(255,255,255,.18)');
  haze.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = haze;
  g.fillRect(0, 0, W, 2 * S);
  (
    [
      [W * 0.2, S * 0.95, 34, 30],
      [W * 0.78, S * 0.9, 36, 34],
      [W * 0.5, S * 0.78, 40, 44],
    ] as [number, number, number, number][]
  ).forEach(([x, b, w, h]) => peak(g, x, b + 8, w, h, r, false));
  (
    [
      [W * 0.3, S * 1.55, 46, 52],
      [W * 0.74, S * 1.62, 44, 46],
      [W * 0.52, S * 1.45, 52, 64],
    ] as [number, number, number, number][]
  ).forEach(([x, b, w, h]) => peak(g, x, b + 14, w, h, r, true));
  const cx = W * 0.38;
  const cy = S * 1.18;
  g.fillStyle = '#1c1a2b';
  ellipse(g, cx, cy, 5.5, 3.6);
  g.fillStyle = 'rgba(120,80,40,.8)';
  g.fillRect(cx - 6, cy + 3, 12, 1.6);
  g.fillStyle = '#c4864d';
  circle(g, cx - 9, cy + 8, 1.3);
  circle(g, cx - 6, cy + 10, 1.3);
  const mist = g.createRadialGradient(W * 0.5, S * 1.3, 4, W * 0.5, S * 1.3, 40);
  mist.addColorStop(0, 'rgba(255,255,255,.28)');
  mist.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = mist;
  g.fillRect(0, S * 0.6, W, S * 1.4);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = 'rgba(32,80,40,.85)';
    circle(g, r() * W, 2 * S - 8 - r() * 10, 1.6 + r() * 1.4);
  }
}

function paintDesert(g: Ctx, r: Rng) {
  for (let i = 0; i < 7; i++) {
    const y = 14 + i * 17 + (r() - 0.5) * 6;
    g.beginPath();
    g.moveTo(-8, y);
    g.bezierCurveTo(W * 0.3, y - 14 - r() * 6, W * 0.65, y + 10 + r() * 6, W + 8, y - 6 - r() * 5);
    g.lineTo(W + 8, y + 26);
    g.lineTo(-8, y + 26);
    g.closePath();
    const gr = g.createLinearGradient(0, y - 12, 0, y + 22);
    gr.addColorStop(0, 'rgba(255,248,215,.55)');
    gr.addColorStop(0.55, 'rgba(240,215,160,0)');
    gr.addColorStop(1, 'rgba(240,215,160,0)');
    g.fillStyle = gr;
    g.fill();
    g.beginPath();
    g.moveTo(-8, y + 3);
    g.bezierCurveTo(W * 0.3, y - 11 - r() * 4, W * 0.65, y + 13 + r() * 4, W + 8, y - 3 - r() * 4);
    g.lineWidth = 2.4;
    g.strokeStyle = 'rgba(150,105,50,.22)';
    g.stroke();
  }
  for (let k = 0; k < 2; k++) {
    const x = W * (0.28 + r() * 0.5);
    const y = S * (0.7 + r() * 0.8);
    g.strokeStyle = '#5a3d22';
    g.lineWidth = 1.3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x, y - 9);
    g.moveTo(x, y - 5);
    g.lineTo(x - 5, y - 10);
    g.moveTo(x, y - 7);
    g.lineTo(x + 4, y - 12);
    g.moveTo(x - 5, y - 10);
    g.lineTo(x - 7, y - 9);
    g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const x = r() * W;
    const y = r() * 2 * S;
    g.fillStyle = 'rgba(0,0,0,.22)';
    ellipse(g, x + 0.6, y + 0.9, 1.5, 0.7);
    g.fillStyle = pick(r, ['#d9c08a', '#b8995e', '#e8d4a2']);
    ellipse(g, x, y, 1.3 + r() * 1.2, 0.9 + r() * 0.6);
  }
}

const PAINTERS: Record<ResourceType, (g: Ctx, r: Rng) => void> = {
  pasture: paintPasture,
  fields: paintFields,
  forest: paintForest,
  hills: paintHills,
  mountains: paintMountains,
  desert: paintDesert,
};

/** Pixels per board unit. 4 keeps tiles crisp up to ~4K screens while each bitmap stays small. */
const TILE_PX = 4;

function paintTile(kind: ResourceType, variant: number): string {
  const px = TILE_PX;
  const cw = Math.ceil(W * px);
  const ch = Math.ceil(2 * S * px);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext('2d')!;
  const seed = hashStr(kind) + variant * 7919;
  const r = mulberry32(seed);
  const noise = makeNoise(seed * 3 + 1);
  const [light, dark] = PALETTE[kind].map(hex2rgb);

  const img = g.createImageData(cw, ch);
  const d = img.data;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      let t = noise(x / px / 11, y / px / 11, 5);
      t = Math.min(1, Math.max(0, (t - 0.28) * 1.9));
      const fine = noise((x / px) * 0.9, (y / px) * 0.9, 2) * 0.1 - 0.05;
      const lite = 1.07 - 0.16 * (x / cw + y / ch) + fine;
      const i = (y * cw + x) * 4;
      d[i] = Math.min(255, lerp(dark.r, light.r, t) * lite);
      d[i + 1] = Math.min(255, lerp(dark.g, light.g, t) * lite);
      d[i + 2] = Math.min(255, lerp(dark.b, light.b, t) * lite);
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  g.setTransform(px, 0, 0, px, 0, 0);
  g.save();
  hexPath(g, W / 2, S, S * 0.95);
  g.clip();
  PAINTERS[kind](g, r);
  const vignette = g.createRadialGradient(W / 2, S, S * 0.55, W / 2, S, S * 1.02);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(40,25,5,.38)');
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, 2 * S);
  g.restore();

  // Feathered edge: a blurred hexagon mask, so the cream rim under the tile shows through softly.
  const mask = document.createElement('canvas');
  mask.width = cw;
  mask.height = ch;
  const mg = mask.getContext('2d')!;
  mg.filter = `blur(${1.4 * px}px)`;
  mg.fillStyle = '#000';
  mg.setTransform(px, 0, 0, px, 0, 0);
  hexPath(mg, W / 2, S, S * 0.9);
  mg.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mask, 0, 0);
  g.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/webp', 0.92);
}

const tileCache = new Map<string, string>();
const keyOf = (kind: ResourceType, variant: number) => `${kind}:${variant}`;

/** The already-painted bitmap URL, if this tile has been generated. */
export function peekTile(kind: ResourceType, variant: number): string | undefined {
  return tileCache.get(keyOf(kind, variant));
}

/** Paint (once) and return the bitmap URL for a terrain/variant. */
export function ensureTile(kind: ResourceType, variant: number): string {
  const key = keyOf(kind, variant);
  let url = tileCache.get(key);
  if (!url) {
    url = paintTile(kind, variant);
    tileCache.set(key, url);
  }
  return url;
}
