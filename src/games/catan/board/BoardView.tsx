import { memo, useCallback, useMemo, useRef } from 'react';
import type { Board, BuildMode, Harbor, Hex, HarborType, Player } from '../types';
import { GEMS, getGem } from '../../../shared/theme/gems';
import { HEX_SIZE } from './geometry';
import { RESOURCE_COLORS, HARBOR_RATIO, harborColor } from './resourceColors';
import { Skull } from '../../../shared/icons';

interface BoardViewProps {
  board: Board;
  players: Player[];
  buildMode: BuildMode;
  currentPlayerGem: string | null;
  /** Spots the current tool can legally act on — only these are marked; the rest still answer a tap with a hint. */
  legalVertexIds: Set<number>;
  legalEdgeIds: Set<number>;
  onVertexClick: (vertexId: number) => void;
  onEdgeClick: (edgeId: number) => void;
  onHexClick: (hexId: number) => void;
}

/** Dots under a number token = how many of the 36 dice combinations roll it (7 is excluded). */
const PROBABILITY_DOTS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

function hexPolygonPoints(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`;
  }).join(' ');
}

/** Radial gradients for every gem, defined once and referenced by id everywhere on the board. */
function GemGradientDefs() {
  return (
    <defs>
      {GEMS.map((gem) => (
        <radialGradient key={gem.id} id={`board-gem-${gem.id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={gem.c1} />
          <stop offset="55%" stopColor={gem.c2} />
          <stop offset="100%" stopColor={gem.c3} />
        </radialGradient>
      ))}
    </defs>
  );
}

interface HarborGeometry {
  id: number;
  type: HarborType;
  x: number;
  y: number;
  ends: [number, number, number, number];
}

interface BoardBaseProps {
  hexes: Hex[];
  harbors: HarborGeometry[];
  robberHexId: number;
  hexInteractive: boolean;
  onHexClick: (hexId: number) => void;
}

/** Hexes, number tokens, harbours and robber. Static between placements, so it's memoised and skipped on most re-renders. */
const BoardBase = memo(function BoardBase({ hexes, harbors, robberHexId, hexInteractive, onHexClick }: BoardBaseProps) {
  return (
    <>
      {hexes.map((hex) => {
        const red = hex.number === 6 || hex.number === 8;
        const tokenColor = red ? 'var(--ember)' : 'var(--charred-oak)';
        const dots = hex.number !== null ? PROBABILITY_DOTS[hex.number] : 0;
        return (
          <g key={hex.id} onClick={() => hexInteractive && onHexClick(hex.id)} style={{ cursor: hexInteractive ? 'crosshair' : 'default' }}>
            <polygon
              points={hexPolygonPoints(hex.x, hex.y)}
              fill={RESOURCE_COLORS[hex.resource]}
              stroke="var(--charred-oak)"
              strokeWidth={3}
            />
            {hex.number !== null && (
              <g>
                <circle cx={hex.x} cy={hex.y} r={HEX_SIZE * 0.4} fill="var(--parchment)" stroke="rgba(0,0,0,.35)" strokeWidth={1} />
                <text
                  x={hex.x}
                  y={hex.y - 3}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={700}
                  fontSize={hex.number > 9 ? HEX_SIZE * 0.33 : HEX_SIZE * 0.37}
                  fill={tokenColor}
                >
                  {hex.number}
                </text>
                {Array.from({ length: dots }, (_, i) => (
                  <circle key={i} cx={hex.x + (i - (dots - 1) / 2) * 5.6} cy={hex.y + 15.5} r={2.2} fill={tokenColor} />
                ))}
              </g>
            )}
            {robberHexId === hex.id && (
              <g transform={`translate(${hex.x - 14}, ${hex.y - 14})`}>
                <circle cx={14} cy={14} r={19} fill="var(--charred-oak)" stroke="var(--brass)" strokeWidth={2} />
                <Skull x={4} y={4} width={20} height={20} color="var(--parchment)" strokeWidth={2} />
              </g>
            )}
          </g>
        );
      })}

      {harbors.map((harbor) => (
        <g key={harbor.id}>
          <line x1={harbor.x} y1={harbor.y} x2={harbor.ends[0]} y2={harbor.ends[1]} stroke="var(--parchment-dim)" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
          <line x1={harbor.x} y1={harbor.y} x2={harbor.ends[2]} y2={harbor.ends[3]} stroke="var(--parchment-dim)" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
          <circle cx={harbor.x} cy={harbor.y} r={23} fill="var(--walnut)" stroke={harborColor(harbor.type)} strokeWidth={2.5} />
          <text
            x={harbor.x}
            y={harbor.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700}
            fontSize={13}
            fill="var(--parchment)"
          >
            {HARBOR_RATIO[harbor.type]}
          </text>
        </g>
      ))}
    </>
  );
});

/** Where each harbour marker sits: a fixed offset straight out from its own coastal edge (not from the board centroid, which points the wrong way on this board's non-convex outline). */
function harborGeometry(board: Board, harbors: Harbor[]): HarborGeometry[] {
  const offset = 46;
  return harbors.flatMap((harbor) => {
    const edge = board.edges.find((e) => e.id === harbor.edgeId);
    const v1 = edge && board.vertices.find((v) => v.id === edge.v1);
    const v2 = edge && board.vertices.find((v) => v.id === edge.v2);
    if (!v1 || !v2) return [];
    const mx = (v1.x + v2.x) / 2;
    const my = (v1.y + v2.y) / 2;
    return [
      {
        id: harbor.id,
        type: harbor.type,
        x: mx + Math.cos(harbor.angle) * offset,
        y: my + Math.sin(harbor.angle) * offset,
        ends: [v1.x, v1.y, v2.x, v2.y] as [number, number, number, number],
      },
    ];
  });
}

export function BoardView({
  board,
  players,
  buildMode,
  currentPlayerGem,
  legalVertexIds,
  legalEdgeIds,
  onVertexClick,
  onEdgeClick,
  onHexClick,
}: BoardViewProps) {
  const gemBySlot = useMemo(() => new Map(players.map((p) => [p.slot, p.gem])), [players]);

  const viewBox = useMemo(() => {
    const pad = 74;
    const xs = board.vertices.map((v) => v.x);
    const ys = board.vertices.map((v) => v.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [board.vertices]);

  const vertexById = useMemo(() => new Map(board.vertices.map((v) => [v.id, v])), [board.vertices]);
  const harbors = useMemo(() => harborGeometry(board, board.harbors), [board.harbors, board.hexes]);

  // A stable callback keeps BoardBase's memo valid even though the parent re-creates its handlers every render.
  const hexClickRef = useRef(onHexClick);
  hexClickRef.current = onHexClick;
  const handleHexClick = useCallback((hexId: number) => hexClickRef.current(hexId), []);

  const vertexInteractive = buildMode === 'settlement' || buildMode === 'city' || buildMode === 'erase';
  const edgeInteractive = buildMode === 'road' || buildMode === 'erase';
  const hexInteractive = buildMode === 'robber';
  const glowColor = currentPlayerGem ? getGem(currentPlayerGem)?.glow : undefined;

  return (
    <svg viewBox={viewBox} className="h-full w-full select-none" style={{ touchAction: 'manipulation' }}>
      <GemGradientDefs />

      <BoardBase hexes={board.hexes} harbors={harbors} robberHexId={board.robberHexId} hexInteractive={hexInteractive} onHexClick={handleHexClick} />

      {/* Roads */}
      {board.edges.map((edge) => {
        const v1 = vertexById.get(edge.v1)!;
        const v2 = vertexById.get(edge.v2)!;
        const gem = edge.road ? getGem(gemBySlot.get(edge.road.playerId) ?? null) : undefined;
        const legal = edgeInteractive && legalEdgeIds.has(edge.id);
        return (
          <g key={edge.id}>
            {edge.road && (
              <>
                <line x1={v1.x} y1={v1.y} x2={v2.x} y2={v2.y} stroke="var(--charred-oak)" strokeWidth={11} strokeLinecap="round" />
                <line
                  x1={v1.x}
                  y1={v1.y}
                  x2={v2.x}
                  y2={v2.y}
                  stroke={gem ? gem.c2 : 'var(--brass)'}
                  strokeWidth={6.5}
                  strokeLinecap="round"
                />
              </>
            )}
            {legal && (
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke={edge.road ? 'var(--parchment)' : glowColor ?? 'var(--brass-soft)'}
                strokeWidth={edge.road ? 4 : 8}
                strokeLinecap="round"
                opacity={0.75}
                pointerEvents="none"
              />
            )}
            {edgeInteractive && (
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke="transparent"
                strokeWidth={18}
                style={{ cursor: 'pointer' }}
                onClick={() => onEdgeClick(edge.id)}
              />
            )}
          </g>
        );
      })}

      {/* Vertices / buildings */}
      {board.vertices.map((vertex) => {
        const gem = vertex.building ? getGem(gemBySlot.get(vertex.building.playerId) ?? null) : undefined;
        const legal = vertexInteractive && legalVertexIds.has(vertex.id);
        return (
          <g key={vertex.id}>
            {vertex.building && gem && (
              <>
                {vertex.building.type === 'settlement' ? (
                  <circle cx={vertex.x} cy={vertex.y} r={10} fill={`url(#board-gem-${gem.id})`} stroke="rgba(0,0,0,.4)" strokeWidth={1.5} />
                ) : (
                  <rect
                    x={vertex.x - 12}
                    y={vertex.y - 12}
                    width={24}
                    height={24}
                    rx={5}
                    fill={`url(#board-gem-${gem.id})`}
                    stroke="rgba(0,0,0,.4)"
                    strokeWidth={1.5}
                  />
                )}
              </>
            )}
            {legal && (
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={vertex.building ? 16 : 11}
                fill={vertex.building ? 'transparent' : 'rgba(237,225,200,.22)'}
                stroke={glowColor ?? 'var(--brass)'}
                strokeWidth={vertex.building ? 2.5 : 2}
                strokeDasharray={vertex.building ? '3 3' : undefined}
                pointerEvents="none"
              />
            )}
            {vertexInteractive && (
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={14}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onVertexClick(vertex.id)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
