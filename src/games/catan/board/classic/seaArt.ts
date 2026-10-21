import type { Hex } from '../../types';
import { frameCorners } from '../viewBox';
import type { ViewBox } from '../viewBox';
import { S, hexPath, makeNoise } from './art';

/**
 * The Classic board's sea: a turquoise gradient clipped to the hexagonal frame, light caustic ripples,
 * a pale shallow-water halo, white foam and a sandy shore hugging the island. One bitmap per board layout.
 */
function paintSea(hexes: Hex[], vb: ViewBox, k = 1.2): string {
  const w = Math.ceil(vb.w * k);
  const h = Math.ceil(vb.h * k);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  g.setTransform(k, 0, 0, k, -vb.x * k, -vb.y * k);

  g.save();
  g.beginPath();
  frameCorners(vb).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();

  const cx = hexes.reduce((s, hx) => s + hx.x, 0) / hexes.length;
  const cy = hexes.reduce((s, hx) => s + hx.y, 0) / hexes.length;

  let gr = g.createLinearGradient(vb.x, vb.y, vb.x + vb.w, vb.y + vb.h);
  gr.addColorStop(0, '#1fb6e8');
  gr.addColorStop(0.5, '#1096d2');
  gr.addColorStop(1, '#0766a8');
  g.fillStyle = gr;
  g.fillRect(vb.x, vb.y, vb.w, vb.h);
  gr = g.createRadialGradient(cx, cy, 20, cx, cy, Math.max(vb.w, vb.h) * 0.62);
  gr.addColorStop(0, 'rgba(120,228,238,.42)');
  gr.addColorStop(0.55, 'rgba(70,200,230,.2)');
  gr.addColorStop(1, 'rgba(0,40,90,0)');
  g.fillStyle = gr;
  g.fillRect(vb.x, vb.y, vb.w, vb.h);

  // Caustic ripples: ridged noise at a third of the resolution, upscaled smoothly.
  const lw = Math.ceil(w / 3);
  const lh = Math.ceil(h / 3);
  const low = document.createElement('canvas');
  low.width = lw;
  low.height = lh;
  const lg = low.getContext('2d')!;
  const img = lg.createImageData(lw, lh);
  const n1 = makeNoise(11);
  const n2 = makeNoise(29);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const wx = (x / lw) * vb.w;
      const wy = (y / lh) * vb.h;
      const u = n1(wx / 38 + n2(wx / 90, wy / 90, 2) * 1.4, wy / 38, 3);
      const ridge = 1 - Math.abs(2 * u - 1);
      const a = Math.pow(ridge, 10) * 0.4;
      const i = (y * lw + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, a * 255);
    }
  }
  lg.putImageData(img, 0, 0);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(low, 0, 0, w, h);
  g.restore();

  const blobHexes = (radius: number, fill: string, blur: number) => {
    g.save();
    g.filter = `blur(${blur * k}px)`;
    g.fillStyle = fill;
    hexes.forEach((hx) => {
      hexPath(g, hx.x, hx.y, radius);
      g.fill();
    });
    g.restore();
  };
  blobHexes(S * 1.55, 'rgba(150,236,242,.36)', 15);
  blobHexes(S * 1.2, 'rgba(235,255,255,.55)', 5);
  blobHexes(S * 1.1, '#f4e4b4', 1.6);
  g.restore();

  return canvas.toDataURL('image/webp', 0.9);
}

const seaCache = new WeakMap<Hex[], string>();

export function peekSea(hexes: Hex[]): string | undefined {
  return seaCache.get(hexes);
}

export function ensureSea(hexes: Hex[], vb: ViewBox): string {
  let url = seaCache.get(hexes);
  if (!url) {
    url = paintSea(hexes, vb);
    seaCache.set(hexes, url);
  }
  return url;
}
