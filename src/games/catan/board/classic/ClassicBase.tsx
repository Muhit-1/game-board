import { memo } from 'react';
import type { Hex, ResourceType } from '../../types';
import { HEX_SIZE, HEX_WIDTH } from '../geometry';
import { HARBOR_RATIO, harborColor } from '../resourceColors';
import { frameCorners } from '../viewBox';
import type { ViewBox } from '../viewBox';
import type { HarborGeometry } from '../harborGeometry';

const PROBABILITY_DOTS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`;
  }).join(' ');
}

/** Gradients for tokens and the robber pawn (the pieces' gradients live in ClassicPieceDefs). */
export function ClassicBaseDefs() {
  return (
    <>
      <radialGradient id="classic-token" cx="38%" cy="32%" r="75%">
        <stop offset="0" stopColor="#fbf0cd" />
        <stop offset="0.7" stopColor="#ecd9a2" />
        <stop offset="1" stopColor="#d9bf80" />
      </radialGradient>
      <linearGradient id="classic-robber" x1="0" x2="1">
        <stop offset="0" stopColor="#6a6a6a" />
        <stop offset="0.5" stopColor="#2e2e2e" />
        <stop offset="1" stopColor="#101010" />
      </linearGradient>
    </>
  );
}

function Token({ hex }: { hex: Hex }) {
  if (hex.number === null) return null;
  const red = hex.number === 6 || hex.number === 8;
  const ink = red ? '#c1272d' : '#2a2118';
  const dots = PROBABILITY_DOTS[hex.number];
  return (
    <g pointerEvents="none">
      <circle cx={hex.x + 1.5} cy={hex.y + 3} r={24} fill="rgba(0,0,0,.28)" />
      <circle cx={hex.x} cy={hex.y} r={24} fill="url(#classic-token)" stroke="#a98543" strokeWidth={1.6} />
      <circle cx={hex.x} cy={hex.y} r={21} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={0.8} />
      <text
        x={hex.x}
        y={hex.y - 3}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight={700}
        fontSize={hex.number > 9 ? 20 : 23}
        fill={ink}
      >
        {hex.number}
      </text>
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} cx={hex.x + (i - (dots - 1) / 2) * 5.6} cy={hex.y + 15.5} r={2.2} fill={ink} />
      ))}
    </g>
  );
}

/** A wooden pier from each coastal corner out to a little boat carrying the trade badge. */
function Harbor({ harbor }: { harbor: HarborGeometry }) {
  const color = harborColor(harbor.type);
  const generic = harbor.type === 'generic';
  const corners: [number, number][] = [
    [harbor.ends[0], harbor.ends[1]],
    [harbor.ends[2], harbor.ends[3]],
  ];
  const piers = corners.map(([px, py], i) => {
    const dx = harbor.x - px;
    const dy = harbor.y - py;
    const len = Math.hypot(dx, dy);
    const ex = px + (dx / len) * (len - 20);
    const ey = py + (dy / len) * (len - 20);
    return (
      <g key={i}>
        <line x1={px} y1={py} x2={ex} y2={ey} stroke="rgba(0,0,0,.3)" strokeWidth={7} strokeLinecap="round" transform="translate(1.5 2.5)" />
        <line x1={px} y1={py} x2={ex} y2={ey} stroke="#5e3b1c" strokeWidth={6.5} strokeLinecap="round" />
        <line x1={px} y1={py} x2={ex} y2={ey} stroke="#b98a4e" strokeWidth={3.8} strokeLinecap="round" strokeDasharray="4 1.6" />
      </g>
    );
  });
  return (
    <g pointerEvents="none">
      {piers}
      <g transform={`translate(${harbor.x} ${harbor.y})`}>
        <ellipse cx={2} cy={16} rx={26} ry={6} fill="rgba(0,40,80,.35)" />
        <path d="M-24 6 Q0 26 24 6 L18 -1 L-18 -1 Z" fill="#7b4a22" stroke="#3f2410" strokeWidth={1.4} />
        <path d="M-18 -1 L18 -1" stroke="#c99458" strokeWidth={2} />
        <circle cx={0} cy={-14} r={17} fill="#f3e5bd" stroke={color} strokeWidth={4} />
        <text x={0} y={-13} textAnchor="middle" dominantBaseline="central" fontFamily="Fraunces, Georgia, serif" fontWeight={700} fontSize={generic ? 13 : 14} fill="#2a2118">
          {HARBOR_RATIO[harbor.type]}
        </text>
        {!generic && <circle cx={15} cy={-28} r={6.2} fill={color} stroke="#2a2118" strokeWidth={1.2} />}
      </g>
    </g>
  );
}

function Robber({ hex }: { hex: Hex }) {
  return (
    <g transform={`translate(${hex.x} ${hex.y - 4})`} pointerEvents="none">
      <ellipse cx={2} cy={22} rx={14} ry={5} fill="rgba(0,0,0,.35)" />
      <path d="M-11 21 Q-9 8 -4 3 Q-9 1 -9 -7 A9 9 0 1 1 9 -7 Q9 1 4 3 Q9 8 11 21 Z" fill="url(#classic-robber)" stroke="#111" strokeWidth={1.2} />
    </g>
  );
}

interface ClassicBaseProps {
  hexes: Hex[];
  variants: number[];
  /** Bumps when more bitmaps are ready; part of the props only so the memo redraws. */
  version: number;
  tileUrl: (kind: ResourceType, variant: number) => string | undefined;
  seaUrl: string | undefined;
  harbors: HarborGeometry[];
  robberHexId: number;
  vb: ViewBox;
  hexInteractive: boolean;
  onHexClick: (hexId: number) => void;
}

/** Frame, sea, painted tiles, tokens, harbours and robber. Static between placements, so memoised. */
export const ClassicBase = memo(function ClassicBase({ hexes, variants, tileUrl, seaUrl, harbors, robberHexId, vb, hexInteractive, onHexClick }: ClassicBaseProps) {
  const frame = frameCorners(vb)
    .map((p) => p.join(','))
    .join(' ');
  const robberHex = hexes.find((h) => h.id === robberHexId);
  return (
    <>
      <polygon points={frame} fill="rgba(0,0,0,.38)" transform="translate(3 6)" />
      <polygon points={frame} fill="#0f86bd" />
      {seaUrl && <image href={seaUrl} x={vb.x} y={vb.y} width={vb.w} height={vb.h} />}
      <polygon points={frame} fill="none" stroke="#f4ebcf" strokeWidth={6} strokeLinejoin="round" />
      <polygon points={frame} fill="none" stroke="rgba(90,60,25,.55)" strokeWidth={1.2} />

      {hexes.map((hex) => (
        <polygon key={`rim-${hex.id}`} points={hexPoints(hex.x, hex.y, HEX_SIZE)} fill="#efdcae" stroke="#c8ad73" strokeWidth={1.4} strokeLinejoin="round" />
      ))}
      {hexes.map((hex, i) => {
        const url = tileUrl(hex.resource, variants[i]);
        return url ? <image key={`tile-${hex.id}`} href={url} x={hex.x - HEX_WIDTH / 2} y={hex.y - HEX_SIZE} width={HEX_WIDTH} height={HEX_SIZE * 2} /> : null;
      })}

      {harbors.map((harbor) => (
        <Harbor key={harbor.id} harbor={harbor} />
      ))}
      {hexes.map((hex) => (
        <Token key={`tok-${hex.id}`} hex={hex} />
      ))}
      {robberHex && <Robber hex={robberHex} />}

      {hexInteractive &&
        hexes.map((hex) => (
          <polygon
            key={`hit-${hex.id}`}
            points={hexPoints(hex.x, hex.y, HEX_SIZE)}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onClick={() => onHexClick(hex.id)}
          />
        ))}
    </>
  );
});
