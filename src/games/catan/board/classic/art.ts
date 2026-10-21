/** Small helpers shared by the Classic board's procedural art (seeded random, value noise, colour maths, canvas shapes). */
import { HEX_SIZE } from '../geometry';

export type Rng = () => number;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeNoise(seed: number): (x: number, y: number, octaves?: number) => number {
  const r = mulberry32(seed);
  const G = 256;
  const p = new Float32Array(G * G);
  for (let i = 0; i < p.length; i++) p[i] = r();
  const smooth = (t: number) => t * t * (3 - 2 * t);
  function n(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = xi & 255;
    const x1 = (xi + 1) & 255;
    const y0 = yi & 255;
    const y1 = (yi + 1) & 255;
    const a = p[y0 * G + x0];
    const b = p[y0 * G + x1];
    const c = p[y1 * G + x0];
    const d = p[y1 * G + x1];
    const u = smooth(xf);
    const v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  return (x, y, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    let total = 0;
    for (let i = 0; i < octaves; i++) {
      sum += n(x * f, y * f) * amp;
      total += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / total;
  };
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hex2rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

/** Mix a hex colour toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const c = hex2rgb(hex);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return `#${[c.r, c.g, c.b].map((v) => Math.round(lerp(v, target, t)).toString(16).padStart(2, '0')).join('')}`;
}

export function pick<T>(r: Rng, items: T[]): T {
  return items[Math.floor(r() * items.length)];
}

export function circle(g: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.fill();
}

export function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
}

/** Pointy-top hexagon path, matching the board geometry. */
export function hexPath(g: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

export const S = HEX_SIZE;
export const W = Math.sqrt(3) * HEX_SIZE;
