import { memo, useEffect, useReducer, useRef } from 'react';
import { useMapCamera } from './useMapCamera';
import { Maximize, Minus, Plus } from '../../../shared/icons';
import { MAP_HEIGHT, MAP_WIDTH, STATIONS } from '../data/stations';
import { STATION_BY_ID, stationKind } from '../data/graph';
import { MAP_EDGES, ensureMapGround, peekMapGround, roadPath } from './mapArt';
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
  /** Mr. X's real station — only passed once the game is over. */
  revealedStation: number | null;
  onStationClick: (station: number) => void;
}

/** Paints the ground bitmap in a separate task so the page stays responsive; returns it once ready. */
function useMapGround(): string | null {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (peekMapGround()) return;
    const timer = window.setTimeout(() => {
      ensureMapGround();
      refresh();
    }, 30);
    return () => window.clearTimeout(timer);
  }, []);
  return peekMapGround();
}

const ROAD_STYLES = {
  taxi: { casing: 19, line: 11, color: '#f3d54e' },
  bus: { casing: 21, line: 11, color: '#e9c93e' },
  ug: { casing: 24, line: 9, color: '#d6403f' },
} as const;

/** Roads and station discs. Static for the whole game, so it is memoised and never redrawn on a move. */
const MapBase = memo(function MapBase({ ground }: { ground: string | null }) {
  const casing = MAP_EDGES.filter((e) => e.transport !== 'ferry');
  return (
    <>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#e6d3a5" />
      {ground && <image href={ground} x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} />}
      {casing.map((e) => (
        <path key={`c-${e.transport}-${e.a.id}-${e.b.id}`} d={roadPath(e.a, e.b)} fill="none" stroke="#fffaf0" strokeWidth={ROAD_STYLES[e.transport as 'taxi'].casing} strokeLinecap="round" />
      ))}
      {MAP_EDGES.filter((e) => e.transport === 'taxi').map((e) => (
        <path key={`t-${e.a.id}-${e.b.id}`} d={roadPath(e.a, e.b)} fill="none" stroke={ROAD_STYLES.taxi.color} strokeWidth={ROAD_STYLES.taxi.line} strokeLinecap="round" />
      ))}
      {MAP_EDGES.filter((e) => e.transport === 'bus').map((e) => (
        <g key={`b-${e.a.id}-${e.b.id}`}>
          <path d={roadPath(e.a, e.b)} fill="none" stroke="#e9c93e" strokeWidth={11} strokeLinecap="round" />
          <path d={roadPath(e.a, e.b)} fill="none" stroke="#1d9b9a" strokeWidth={7} strokeLinecap="round" />
        </g>
      ))}
      {MAP_EDGES.filter((e) => e.transport === 'ug').map((e) => (
        <path key={`u-${e.a.id}-${e.b.id}`} d={roadPath(e.a, e.b)} fill="none" stroke="#d6403f" strokeWidth={9} strokeLinecap="round" strokeDasharray="26 16" />
      ))}
      {MAP_EDGES.filter((e) => e.transport === 'ferry').map((e) => (
        <path key={`f-${e.a.id}-${e.b.id}`} d={roadPath(e.a, e.b)} fill="none" stroke="#1c1c1c" strokeWidth={8} strokeLinecap="round" strokeDasharray="24 16" />
      ))}
      {STATIONS.map((s) => {
        const kind = stationKind(s);
        const underground = kind === 'ug';
        return (
          <g key={s.id}>
            <circle cx={s.x} cy={s.y} r={31} fill={underground ? '#d6403f' : '#fff1bf'} stroke="#6b4a1f" strokeWidth={5} />
            {kind !== 'taxi' && <path d={`M${s.x - 25} ${s.y + 10} A27 27 0 0 0 ${s.x + 25} ${s.y + 10} Z`} fill="#1d9b9a" opacity={0.9} />}
            <circle cx={s.x} cy={s.y} r={31} fill="none" stroke="#6b4a1f" strokeWidth={5} />
            <text
              x={s.x}
              y={s.y - 3}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Karla, sans-serif"
              fontWeight={700}
              fontSize={s.id > 99 ? 25 : 28}
              fill={underground ? '#fff' : '#2a2118'}
            >
              {s.id}
            </text>
          </g>
        );
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
    <g pointerEvents="none">
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

export function MapView({ pawns, lastSeen, targets, revealedStation, onStationClick }: MapViewProps) {
  const ground = useMapGround();
  const seen = lastSeen ? STATION_BY_ID.get(lastSeen.station) : undefined;
  const revealed = revealedStation !== null ? STATION_BY_ID.get(revealedStation) : undefined;

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
      <MapBase ground={ground} />

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
            <circle cx={s.x} cy={s.y} r={46} fill={color} fillOpacity={0.24} stroke={color} strokeWidth={9} />
            {tickets.slice(1).map((t, i) => (
              <circle key={t} cx={s.x - 12 + i * 24} cy={s.y - 58} r={9} fill={TICKET_COLORS[t]} stroke="#fff" strokeWidth={3} />
            ))}
            <circle cx={s.x} cy={s.y} r={46} fill="transparent" />
          </g>
        );
      })}

      {pawns.map((p) => {
        const s = STATION_BY_ID.get(p.station);
        return s ? <Pawn key={p.slot} x={s.x} y={s.y} gem={p.gem} /> : null;
      })}

      {/* End of the game: Mr. X's real station. */}
      {revealed && (
        <g pointerEvents="none">
          <circle cx={revealed.x} cy={revealed.y} r={50} fill="#111" fillOpacity={0.85} stroke="#fffaf0" strokeWidth={7} />
          <text x={revealed.x} y={revealed.y + 2} textAnchor="middle" dominantBaseline="central" fontFamily="Karla, sans-serif" fontWeight={700} fontSize={46} fill="#fffaf0">
            X
          </text>
        </g>
      )}
    </svg>
    <div className="absolute bottom-2 left-2 flex flex-col gap-1.5">
      <ZoomButton label="Zoom in" onClick={() => zoomBy(1.5)}>
        <Plus size={16} strokeWidth={2.2} />
      </ZoomButton>
      <ZoomButton label="Zoom out" onClick={() => zoomBy(1 / 1.5)} disabled={!zoomed}>
        <Minus size={16} strokeWidth={2.2} />
      </ZoomButton>
      {zoomed && (
        <ZoomButton label="Show the whole map" onClick={reset}>
          <Maximize size={15} strokeWidth={2.2} />
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
