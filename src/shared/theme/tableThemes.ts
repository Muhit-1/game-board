import type { CSSProperties } from 'react';

export type TableThemeId = 'ironwood' | 'ivory' | 'natural' | 'blush' | 'caramel' | 'chestnut' | 'walnut' | 'espresso';

export interface TableTheme {
  id: TableThemeId;
  name: string;
  /** The wood colour (for Ironwood: the panel brown). */
  hex: string;
}

/** The "table" the board sits on. Independent of the board style. Plain gradients, no grain pattern. */
export const TABLE_THEMES: TableTheme[] = [
  { id: 'ironwood', name: 'Ironwood Tavern', hex: '#3C2A1C' },
  { id: 'ivory', name: 'Ivory Oak', hex: '#E6D1AC' },
  { id: 'natural', name: 'Natural Oak', hex: '#E8CCB0' },
  { id: 'blush', name: 'Blush Oak', hex: '#DBB093' },
  { id: 'caramel', name: 'Caramel Oak', hex: '#C88354' },
  { id: 'chestnut', name: 'Chestnut Oak', hex: '#A56142' },
  { id: 'walnut', name: 'Walnut', hex: '#875C39' },
  { id: 'espresso', name: 'Espresso Wood', hex: '#462F20' },
];

export const DEFAULT_TABLE_THEME: TableThemeId = 'ironwood';

export function getTableTheme(id: string): TableTheme {
  return TABLE_THEMES.find((t) => t.id === id) ?? TABLE_THEMES[0];
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mix a hex colour toward white by `amount` (0..1) — approximates the lighter end of the table gradient. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Text that sits directly on the table: whichever of a dark or light ink reads better across the gradient. */
function inkFor(hex: string): { ink: string; dim: string } {
  const dark = { ink: '#2b1c10', dim: '#3f2c1b' };
  const light = { ink: '#f6ecd6', dim: '#eadfc4' };
  const worst = (ink: string) => Math.min(contrast(ink, hex), contrast(ink, lighten(hex, 0.12)));
  return worst(dark.dim) >= worst(light.dim) ? dark : light;
}

/** `R G B` channel triplet for an hsl colour, as the Tailwind colour variables expect. */
function hslChannels(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };
  return `${f(0)} ${f(8)} ${f(4)}`;
}

const hsl = (h: number, s: number, l: number) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;

/** The original tavern look: warm radial glows over charred oak. */
const IRONWOOD_BACKGROUND =
  'radial-gradient(1100px 700px at 12% -10%, rgba(201, 144, 63, 0.17), transparent 55%), radial-gradient(900px 600px at 100% 10%, rgba(181, 80, 46, 0.13), transparent 50%), #2b2016';

/**
 * Inline style for the page shell: the table background plus overrides of the panel colour variables, so every
 * panel/input in the UI follows the chosen wood. Light woods get dark brown panels, the darkest wood gets lighter ones.
 * `--on-table*` are for the few texts that sit directly on the table (setup page headings).
 */
export function tableThemeStyle(id: TableThemeId): CSSProperties {
  if (id === 'ironwood') {
    return { background: IRONWOOD_BACKGROUND, ['--on-table' as string]: '#ede1c8', ['--on-table-dim' as string]: '#d8cbae' };
  }
  const theme = getTableTheme(id);
  const c = hexToHsl(theme.hex);
  const dark = c.l < 0.3;
  const panel = dark ? 0.27 : 0.17;
  const s = Math.min(c.s, 0.5);
  const text = inkFor(theme.hex);
  // Shadows take the wood's own hue (very dark, same saturation) instead of neutral black, so they blend with the table.
  const shadow = (alpha: number) => `hsl(${c.h.toFixed(0)} ${(s * 100).toFixed(0)}% 6% / ${alpha})`;
  return {
    background: `linear-gradient(135deg, ${hsl(c.h, c.s, Math.min(c.l + 0.08, 0.93))}, ${theme.hex} 50%, ${hsl(c.h, c.s, Math.max(c.l - 0.11, 0.05))})`,
    ['--walnut-rgb' as string]: hslChannels(c.h, s, panel),
    ['--walnut-2-rgb' as string]: hslChannels(c.h, s, panel + 0.06),
    ['--charred-oak-rgb' as string]: hslChannels(c.h, s, Math.max(panel - 0.07, 0.06)),
    ['--shadow-card' as string]: `0 8px 20px ${shadow(0.35)}`,
    ['--shadow-deep' as string]: `0 24px 60px ${shadow(0.5)}`,
    ['--table-shadow' as string]: shadow(0.4),
    ['--on-table' as string]: text.ink,
    ['--on-table-dim' as string]: text.dim,
  };
}
