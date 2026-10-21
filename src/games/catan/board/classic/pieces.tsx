import { GEMS } from '../../../../shared/theme/gems';
import type { GemDef } from '../../../../shared/theme/gems';
import { shade } from './art';

/** Gradients for the painted pieces, one light-face and one shaded-face pair per player colour. */
export function ClassicPieceDefs() {
  return (
    <>
      {GEMS.map((gem) => (
        <g key={gem.id}>
          <linearGradient id={`cp-l-${gem.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(gem.c2, 0.45)} />
            <stop offset="1" stopColor={gem.c2} />
          </linearGradient>
          <linearGradient id={`cp-d-${gem.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={gem.c2} />
            <stop offset="1" stopColor={shade(gem.c3, -0.1)} />
          </linearGradient>
        </g>
      ))}
    </>
  );
}

const OUTLINE = { stroke: 'rgba(0,0,0,.55)', strokeWidth: 1.25, strokeLinejoin: 'round' as const, fill: 'none' };

/** A settlement: a small painted house, lit on the left and shaded on the right, standing on the vertex. */
export function ClassicHouse({ x, y, gem }: { x: number; y: number; gem: GemDef }) {
  const light = `url(#cp-l-${gem.id})`;
  const dark = `url(#cp-d-${gem.id})`;
  return (
    <g transform={`translate(${x} ${y - 1}) scale(1.3)`} pointerEvents="none">
      <ellipse cx={3} cy={9.5} rx={12.5} ry={4.4} fill="rgba(0,0,0,.4)" />
      <path d="M-9 -4 L0 -13 L0 9 L-9 9 Z" fill={light} />
      <path d="M0 -13 L9 -4 L9 9 L0 9 Z" fill={dark} />
      <path d="M-9 -4 L0 -13 L9 -4" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={1.1} strokeLinejoin="round" />
      <line x1={0} y1={-12} x2={0} y2={9} stroke="rgba(255,255,255,.22)" strokeWidth={1} />
      <path d="M-9 -4 L0 -13 L9 -4 L9 9 L-9 9 Z" {...OUTLINE} />
      <ellipse cx={-4.6} cy={-1} rx={1.7} ry={4.4} fill="rgba(255,255,255,.34)" transform="rotate(8 -4.6 -1)" />
    </g>
  );
}

/** A city: the house with a tall tower beside it, clearly bigger so it reads at a glance across the table. */
export function ClassicCity({ x, y, gem }: { x: number; y: number; gem: GemDef }) {
  const light = `url(#cp-l-${gem.id})`;
  const dark = `url(#cp-d-${gem.id})`;
  return (
    <g transform={`translate(${x - 1.9} ${y - 2}) scale(1.25)`} pointerEvents="none">
      <ellipse cx={3} cy={10} rx={19} ry={5} fill="rgba(0,0,0,.4)" />
      <path d="M-15 -3 L-8 -10 L-1 -3 L-1 9 L-15 9 Z" fill={light} />
      <path d="M-8 -10 L-1 -3 L-1 9 L-8 9 Z" fill={dark} opacity={0.55} />
      <path d="M-1 -8 L6 -18 L13 -8 L13 9 L-1 9 Z" fill={light} />
      <path d="M6 -18 L13 -8 L13 9 L6 9 Z" fill={dark} />
      <path d="M-15 -3 L-8 -10 L-1 -3 M-1 -8 L6 -18 L13 -8" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={1.1} strokeLinejoin="round" />
      <line x1={6} y1={-17} x2={6} y2={9} stroke="rgba(255,255,255,.22)" />
      <path d="M-15 -3 L-8 -10 L-1 -3 L-1 -8 L6 -18 L13 -8 L13 9 L-15 9 Z" {...OUTLINE} />
      <ellipse cx={1.8} cy={-6} rx={1.5} ry={4.8} fill="rgba(255,255,255,.34)" />
      <rect x={2.4} y={0} width={3} height={4.2} rx={0.6} fill="rgba(0,0,0,.35)" />
      <rect x={-10} y={2} width={3} height={4} rx={0.6} fill="rgba(0,0,0,.3)" />
    </g>
  );
}

/** A road: a painted plank laid along the tile edge, stopping short of the houses at both ends so they stay visible. */
export function ClassicRoad({ a, b, gem }: { a: { x: number; y: number }; b: { x: number; y: number }; gem: GemDef }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const cut = 14;
  const x1 = a.x + ux * cut;
  const y1 = a.y + uy * cut;
  const x2 = b.x - ux * cut;
  const y2 = b.y - uy * cut;
  const line = (offset: number, width: number, stroke: string, opacity = 1, cap: 'round' | 'butt' = 'round', transform?: string) => (
    <line
      x1={x1 + nx * offset}
      y1={y1 + ny * offset}
      x2={x2 + nx * offset}
      y2={y2 + ny * offset}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap={cap}
      opacity={opacity}
      transform={transform}
    />
  );
  return (
    <g pointerEvents="none">
      {line(0, 12, 'rgba(0,0,0,.34)', 1, 'butt', 'translate(1.6 3)')}
      {line(0, 12.4, '#150e08')}
      {line(0, 9.6, gem.c2)}
      {line(-2.9, 3.1, shade(gem.c1, 0.1), 0.8)}
      {line(3.2, 2.8, gem.c3, 0.7)}
    </g>
  );
}
