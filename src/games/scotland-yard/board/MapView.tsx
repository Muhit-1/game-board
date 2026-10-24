import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useMapCamera } from './useMapCamera';
import { Expand, Maximize, Pin, Shrink } from '../../../shared/icons';
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
  /** Shows the magnifier box (top left) with its full-screen button; omitted for the setup preview. */
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

/** See-through, so the station number underneath stays readable. */
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

/** Pieces and the last-seen marker: static between moves. */
function Pieces({ pawns, lastSeen }: Pick<MapViewProps, 'pawns' | 'lastSeen'>) {
  const seen = lastSeen ? STATION_BY_ID.get(lastSeen.station) : undefined;
  return (
    <>
      {/* Where Mr. X was last seen (a ghost, never his real position). */}
      {seen && lastSeen && (
        <g pointerEvents="none">
          <circle cx={seen.x} cy={seen.y} r={56} fill="rgba(20,20,20,.14)" stroke="#111" strokeWidth={7} strokeDasharray="11 9" />
          <text x={seen.x} y={seen.y - 74} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700} fontSize={36} fill="#111" stroke="#fffaf0" strokeWidth={7} paintOrder="stroke">
            X · seen R{lastSeen.round}
          </text>
        </g>
      )}
      {pawns.map((p) => {
        const s = STATION_BY_ID.get(p.station);
        return s ? <Pawn key={p.slot} x={s.x} y={s.y} gem={p.gem} /> : null;
      })}
    </>
  );
}

interface CallToActionProps {
  targets: Map<number, MoveTicket[]>;
  picking: boolean;
  onStationClick: (station: number) => void;
  wasDragged: () => boolean;
}

/** Stations the moving detective can reach (or, while marking Mr. X, every station). */
function CallToAction({ targets, picking, onStationClick, wasDragged }: CallToActionProps) {
  const tap = (id: number) => () => {
    if (!wasDragged()) onStationClick(id);
  };
  return (
    <>
      {[...targets.entries()].map(([id, tickets]) => {
        const s = STATION_BY_ID.get(id);
        if (!s) return null;
        const color = TICKET_COLORS[tickets[0]];
        return (
          <g key={`target-${id}`} onClick={tap(id)} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
            <circle cx={s.x} cy={s.y} r={44} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={10} />
            {tickets.slice(1).map((t, i) => (
              <circle key={t} cx={s.x - 12 + i * 24} cy={s.y - 58} r={9} fill={TICKET_COLORS[t]} stroke="#fff" strokeWidth={3} />
            ))}
            <circle cx={s.x} cy={s.y} r={44} fill="transparent" />
          </g>
        );
      })}
      {picking &&
        STATIONS.map((st) => (
          <g key={`pick-${st.id}`} onClick={tap(st.id)} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
            <circle cx={st.x} cy={st.y} r={44} fill="rgba(255,255,255,.2)" stroke="#fff" strokeWidth={6} strokeOpacity={0.9} />
          </g>
        ))}
    </>
  );
}

/** The magnifier's zoom steps. 4× shows what the old 2× showed; 2× and 3× show a wider patch. */
const LENS_ZOOM = { 2: 1.25, 3: 1.6, 4: 2 } as const;
type LensLevel = keyof typeof LENS_ZOOM;
const LENS_LEVELS: LensLevel[] = [2, 3, 4];

export function MapView({ pawns, lastSeen, targets, picking, onStationClick, fullscreen = false, onToggleFullscreen }: MapViewProps) {
  const image = useMapImage();
  const svgRef = useRef<SVGSVGElement>(null);
  const lensRef = useRef<SVGSVGElement>(null);
  const { camera, zoomed, reset, geometry, wasDragged, handlers } = useMapCamera(svgRef);
  const viewBox = `${camera.x} ${camera.y} ${camera.w} ${camera.w * (MAP_HEIGHT / MAP_WIDTH)}`;

  const [level, setLevel] = useState<LensLevel>(2);
  const [pinned, setPinned] = useState(false);
  const pinnedRef = useRef(false);
  const centre = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });

  /** Point the magnifier at `centre`, showing LENS_ZOOM[level] times what the map shows at the current zoom. */
  const aim = useCallback(() => {
    const lens = lensRef.current;
    const g = geometry();
    if (!lens || !g) return;
    const rect = lens.getBoundingClientRect();
    const w = (rect.width * g.unit) / LENS_ZOOM[level];
    const h = (rect.height * g.unit) / LENS_ZOOM[level];
    lens.setAttribute('viewBox', `${centre.current.x - w / 2} ${centre.current.y - h / 2} ${w} ${h}`);
  }, [geometry, level]);

  useEffect(aim, [aim, camera]);
  useEffect(() => {
    window.addEventListener('resize', aim);
    return () => window.removeEventListener('resize', aim);
  }, [aim]);

  function follow(e: React.PointerEvent<Element>) {
    if (pinnedRef.current) return;
    const g = geometry();
    if (!g) return;
    centre.current = g.at(e.clientX, e.clientY);
    aim();
  }

  function togglePin() {
    pinnedRef.current = !pinnedRef.current;
    setPinned(pinnedRef.current);
  }

  const showBox = !!onToggleFullscreen;

  return (
    <div
      className="relative h-full w-full"
      {...handlers}
      onPointerMove={(e) => {
        handlers.onPointerMove(e);
        follow(e);
      }}
      onPointerDown={(e) => {
        handlers.onPointerDown(e);
        follow(e);
      }}
    >
      <svg ref={svgRef} viewBox={viewBox} className="h-full w-full select-none" style={{ touchAction: 'none' }}>
        <PawnDefs />
        <MapBase image={image} />
        <Pieces pawns={pawns} lastSeen={lastSeen} />
      </svg>

      {/* Its own layer, so the blinking is a cheap opacity change and never repaints the map. */}
      <svg viewBox={viewBox} className="sy-blink pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <CallToAction targets={targets} picking={picking} onStationClick={onStationClick} wasDragged={wasDragged} />
      </svg>

      {showBox && (
        <div className="absolute left-2 top-2 z-[5] flex flex-col gap-1.5 rounded-xl border border-[var(--line)] bg-walnut/85 p-1.5 shadow-card" role="group" aria-label="Magnifier">
          <div className="relative h-[128px] w-[170px] overflow-hidden rounded-lg border-2 border-brass bg-[#fdf7ea] sm:h-[180px] sm:w-[240px]">
            <svg ref={lensRef} className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-label="Magnified view of the map">
              <MapBase image={image} />
              <Pieces pawns={pawns} lastSeen={lastSeen} />
              <CallToAction targets={targets} picking={false} onStationClick={onStationClick} wasDragged={wasDragged} />
            </svg>
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#141414]/70 shadow-[0_0_0_2px_rgba(255,255,255,.75)]" />
            <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-charred-oak/85 px-2 py-0.5 font-mono text-label font-bold text-brass-soft">{level}×</span>
            {pinned && <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-brass px-2 py-0.5 text-micro font-bold uppercase tracking-caps text-charred-oak">Pinned</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {LENS_LEVELS.map((z) => (
              <BoxButton key={z} label={`Magnifier ${z}×`} pressed={level === z} onClick={() => setLevel(z)}>
                <span className="font-mono text-label font-bold">{z}×</span>
              </BoxButton>
            ))}
            <BoxButton label={pinned ? 'Let the magnifier follow again' : 'Pin the magnifier here'} pressed={pinned} onClick={togglePin}>
              <Pin size={14} strokeWidth={2.2} />
            </BoxButton>
            <BoxButton label="Show the whole map" onClick={reset} disabled={!zoomed}>
              <Maximize size={14} strokeWidth={2.2} />
            </BoxButton>
            <BoxButton label={fullscreen ? 'Leave full screen (Esc)' : 'Full screen map (F)'} onClick={onToggleFullscreen}>
              {fullscreen ? <Shrink size={14} strokeWidth={2.2} /> : <Expand size={14} strokeWidth={2.2} />}
            </BoxButton>
          </div>
        </div>
      )}
    </div>
  );
}

function BoxButton({ label, onClick, disabled = false, pressed, children }: { label: string; onClick?: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={[
        'flex h-[30px] min-w-[30px] flex-1 items-center justify-center rounded-lg border px-1.5 transition-colors disabled:opacity-40',
        pressed ? 'border-brass bg-brass/15 text-brass-soft' : 'border-[var(--line)] bg-charred-oak/40 text-brass hover:bg-walnut-2',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
