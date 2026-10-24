import { memo, useEffect, useRef, useState } from 'react';
import { useMapCamera } from './useMapCamera';
import { Expand, Maximize, Minus, Plus, Shrink } from '../../../shared/icons';
import { MAP_HEIGHT, MAP_WIDTH, STATIONS } from '../data/stations';
import { STATION_BY_ID, stationKind } from '../data/graph';
import mapQuick from './assets/london-1800.webp';
import mapSharp from './assets/london-3900.webp';
import type { LastSeen, MoveTicket } from '../types';
import { GEMS, getGem } from '../../../shared/theme/gems';
import { TICKET_COLORS } from '../ticketStyle';

export interface PawnPlacement {
  slot: number;
  gem: string;
  station: number;
}

interface MapViewProps {
  pawns: PawnPlacement[];
  lastSeen: LastSeen | null;
  /** Stations the moving detective can reach, with the tickets that work. */
  targets: Map<number, MoveTicket[]>;
  /** While true every station can be tapped (the table marks the station Mr. X named). */
  picking: boolean;
  onStationClick: (station: number) => void;
  /** Full-screen toggle shown in the zoom box (omitted where it makes no sense, e.g. the setup preview). */
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/** The drawn London map: a quick 1800 px image first, the 3900 px one swapped in once it has loaded (for zooming). */
function useMapImage(): string {
  const [sharp, setSharp] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const img = new Image();
      img.onload = () => setSharp(true);
      img.src = mapSharp;
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return sharp ? mapSharp : mapQuick;
}

const TAG_SCALE = 0.85;
const TAG_LINE = '#33220f';
const TAG_FONT = "'Archivo Black', 'Arial Black', Arial, sans-serif";

/** One station tag: cream rounded tag, teal top cap when a bus stops there, pink for underground stations. */
function StationTag({ id, x, y, bus, underground }: { id: number; x: number; y: number; bus: boolean; underground: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${TAG_SCALE})`}>
      <path d="M-17 -18 A17 12.5 0 0 1 17 -18 Z" fill={bus ? '#58c4a7' : '#f5c23a'} stroke={TAG_LINE} strokeWidth={4} strokeLinejoin="round" />
      <path d="M-17 18 A17 12.5 0 0 0 17 18 Z" fill="#f5c23a" stroke={TAG_LINE} strokeWidth={4} strokeLinejoin="round" />
      <path
        d="M-22 -18 L22 -18 Q31 -18 31 -9 L31 9 Q31 18 22 18 L-22 18 Q-31 18 -31 9 L-31 -9 Q-31 -18 -22 -18 Z"
        fill={underground ? '#dc3b72' : '#f9e293'}
        stroke={TAG_LINE}
        strokeWidth={4.4}
        strokeLinejoin="round"
      />
      <rect x={-25} y={-14.5} width={50} height={3} fill="#fff" opacity={0.35} />
      <text x={0} y={1.5} textAnchor="middle" dominantBaseline="central" fontFamily={TAG_FONT} fontWeight={800} fontSize={id > 99 ? 27 : 30} fill={underground ? '#fff' : '#25190b'}>
        {id}
      </text>
    </g>
  );
}

/** The map picture (streets, buildings, parks, river and route lines are baked in) and the live number tags. Static, so never redrawn on a move. */
const MapBase = memo(function MapBase({ image }: { image: string }) {
  return (
    <>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#fdf7ea" />
      <image href={image} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} />
      {STATIONS.map((s) => {
        const kind = stationKind(s);
        return <StationTag key={s.id} id={s.id} x={s.x} y={s.y} bus={kind !== 'taxi'} underground={kind === 'ug'} />;
      })}
    </>
  );
});

function PawnDefs() {
  return (
    <defs>
      {GEMS.map((gem) => (
        <radialGradient key={gem.id} id={`sy-pawn-${gem.id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={gem.c1} />
          <stop offset="0.55" stopColor={gem.c2} />
          <stop offset="1" stopColor={gem.c3} />
        </radialGradient>
      ))}
    </defs>
  );
}

function Pawn({ x, y, gem }: { x: number; y: number; gem: string }) {
  const color = getGem(gem);
  if (!color) return null;
  return (
    <g pointerEvents="none" opacity={0.55}>
      <ellipse cx={x + 6} cy={y + 36} rx={30} ry={11} fill="rgba(0,0,0,.38)" />
      <path
        d={`M${x - 26} ${y + 34} Q${x - 24} ${y + 6} ${x - 10} ${y - 4} Q${x - 26} ${y - 12} ${x - 24} ${y - 34} A24 24 0 1 1 ${x + 24} ${y - 34} Q${x + 26} ${y - 12} ${x + 10} ${y - 4} Q${x + 24} ${y + 6} ${x + 26} ${y + 34} Z`}
        fill={`url(#sy-pawn-${color.id})`}
        stroke="rgba(0,0,0,.65)"
        strokeWidth={4}
      />
    </g>
  );
}

export function MapView({ pawns, lastSeen, targets, picking, onStationClick, fullscreen = false, onToggleFullscreen }: MapViewProps) {
  const image = useMapImage();
  const seen = lastSeen ? STATION_BY_ID.get(lastSeen.station) : undefined;

  const svgRef = useRef<SVGSVGElement>(null);
  const { camera, zoomed, zoomBy, reset, wasDragged, handlers } = useMapCamera(svgRef);
  const cameraHeight = camera.w * (MAP_HEIGHT / MAP_WIDTH);

  return (
    <div className="relative h-full w-full">
    <svg
      ref={svgRef}
      viewBox={`${camera.x} ${camera.y} ${camera.w} ${cameraHeight}`}
      className="h-full w-full select-none"
      style={{ touchAction: 'none' }}
      {...handlers}
    >
      <PawnDefs />
      <MapBase image={image} />

      {/* Where Mr. X was last seen (a ghost, never his real position). */}
      {seen && lastSeen && (
        <g pointerEvents="none">
          <circle cx={seen.x} cy={seen.y} r={54} fill="rgba(20,20,20,.14)" stroke="#111" strokeWidth={7} strokeDasharray="11 9" />
          <text
            x={seen.x}
            y={seen.y - 72}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700}
            fontSize={36}
            fill="#111"
            stroke="#fffaf0"
            strokeWidth={7}
            paintOrder="stroke"
          >
            X · seen R{lastSeen.round}
          </text>
        </g>
      )}

      {/* Stations the moving detective can reach. */}
      {[...targets.entries()].map(([id, tickets]) => {
        const s = STATION_BY_ID.get(id);
        if (!s) return null;
        const color = TICKET_COLORS[tickets[0]];
        return (
          <g key={`target-${id}`} onClick={() => !wasDragged() && onStationClick(id)} style={{ cursor: 'pointer' }}>
            <circle cx={s.x} cy={s.y} r={44} fill={color} fillOpacity={0.24} stroke={color} strokeWidth={9} />
            {tickets.slice(1).map((t, i) => (
              <circle key={t} cx={s.x - 12 + i * 24} cy={s.y - 58} r={9} fill={TICKET_COLORS[t]} stroke="#fff" strokeWidth={3} />
            ))}
            <circle cx={s.x} cy={s.y} r={44} fill="transparent" />
          </g>
        );
      })}

      {pawns.map((p) => {
        const s = STATION_BY_ID.get(p.station);
        return s ? <Pawn key={p.slot} x={s.x} y={s.y} gem={p.gem} /> : null;
      })}

      {/* Marking Mr. X's named station: every station answers a tap. */}
      {picking &&
        STATIONS.map((st) => (
          <g key={`pick-${st.id}`} onClick={() => !wasDragged() && onStationClick(st.id)} style={{ cursor: 'pointer' }}>
            <circle cx={st.x} cy={st.y} r={44} fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth={6} strokeOpacity={0.85} />
          </g>
        ))}
    </svg>
    <div className="absolute left-2 top-2 flex flex-col gap-1.5 rounded-xl border border-[var(--line)] bg-walnut/80 p-1.5 shadow-card" role="group" aria-label="Map zoom">
      <ZoomButton label="Zoom in" onClick={() => zoomBy(1.5)}>
        <Plus size={16} strokeWidth={2.2} />
      </ZoomButton>
      <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / 1.5)} disabled={!zoomed}>
        <Minus size={16} strokeWidth={2.2} />
      </ZoomButton>
      <ZoomButton label="Show the whole map" onClick={reset} disabled={!zoomed}>
        <Maximize size={15} strokeWidth={2.2} />
      </ZoomButton>
      {onToggleFullscreen && (
        <ZoomButton label={fullscreen ? 'Leave full screen (Esc)' : 'Full screen map (F)'} onClick={onToggleFullscreen}>
          {fullscreen ? <Shrink size={15} strokeWidth={2.2} /> : <Expand size={15} strokeWidth={2.2} />}
        </ZoomButton>
      )}
    </div>
    </div>
  );
}

function ZoomButton({ label, onClick, disabled = false, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-walnut/90 text-brass shadow-card transition-colors hover:bg-walnut-2 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
