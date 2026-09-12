import { useMemo } from 'react';
import type { Board, BuildMode, Player } from '../types';
import { GEMS, getGem } from '../../../shared/theme/gems';
import { HEX_SIZE } from './geometry';
import { RESOURCE_COLORS, HARBOR_RATIO, harborColor } from './resourceColors';
import { Skull } from '../../../shared/icons';

interface BoardViewProps {
  board: Board;
  players: Player[];
  buildMode: BuildMode;
  currentPlayerGem: string | null;
  onVertexClick: (vertexId: number) => void;
  onEdgeClick: (edgeId: number) => void;
  onHexClick: (hexId: number) => void;
}

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

export function BoardView({ board, players, buildMode, currentPlayerGem, onVertexClick, onEdgeClick, onHexClick }: BoardViewProps) {
  const gemBySlot = useMemo(() => new Map(players.map((p) => [p.slot, p.gem])), [players]);

  const viewBox = useMemo(() => {
    const pad = 55;
    const xs = board.vertices.map((v) => v.x);
    const ys = board.vertices.map((v) => v.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [board.vertices]);

  const centroid = useMemo(() => {
    const n = board.vertices.length;
    return board.vertices.reduce((acc, v) => ({ x: acc.x + v.x / n, y: acc.y + v.y / n }), { x: 0, y: 0 });
  }, [board.vertices]);

  const vertexById = useMemo(() => new Map(board.vertices.map((v) => [v.id, v])), [board.vertices]);
  const vertexInteractive = buildMode === 'settlement' || buildMode === 'city' || buildMode === 'erase';
  const edgeInteractive = buildMode === 'road' || buildMode === 'erase';
  const hexInteractive = buildMode === 'robber';

  return (
    <svg viewBox={viewBox} className="h-full w-full select-none" style={{ touchAction: 'manipulation' }}>
      <GemGradientDefs />

      {/* Hexes */}
      {board.hexes.map((hex) => (
        <g key={hex.id} onClick={() => hexInteractive && onHexClick(hex.id)} style={{ cursor: hexInteractive ? 'crosshair' : 'default' }}>
          <polygon
            points={hexPolygonPoints(hex.x, hex.y)}
            fill={RESOURCE_COLORS[hex.resource]}
            stroke="var(--charred-oak)"
            strokeWidth={3}
          />
          {hex.number !== null && (
            <g>
              <circle cx={hex.x} cy={hex.y} r={HEX_SIZE * 0.32} fill="var(--parchment)" stroke="rgba(0,0,0,.35)" strokeWidth={1} />
              <text
                x={hex.x}
                y={hex.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
                fontSize={HEX_SIZE * 0.34}
                fill={hex.number === 6 || hex.number === 8 ? 'var(--ember)' : 'var(--charred-oak)'}
              >
                {hex.number}
              </text>
            </g>
          )}
          {board.robberHexId === hex.id && (
            <g transform={`translate(${hex.x - 14}, ${hex.y - 14})`}>
              <circle cx={14} cy={14} r={19} fill="var(--charred-oak)" stroke="var(--brass)" strokeWidth={2} />
              <Skull x={4} y={4} width={20} height={20} color="var(--parchment)" strokeWidth={2} />
            </g>
          )}
        </g>
      ))}

      {/* Harbors */}
      {board.harbors.map((harbor) => {
        const edge = board.edges.find((e) => e.id === harbor.edgeId);
        if (!edge) return null;
        const v1 = vertexById.get(edge.v1)!;
        const v2 = vertexById.get(edge.v2)!;
        const mx = (v1.x + v2.x) / 2;
        const my = (v1.y + v2.y) / 2;
        const dist = Math.hypot(mx - centroid.x, my - centroid.y) + 32;
        const hx = centroid.x + Math.cos(harbor.angle) * dist;
        const hy = centroid.y + Math.sin(harbor.angle) * dist;
        return (
          <g key={harbor.id}>
            <line x1={hx} y1={hy} x2={v1.x} y2={v1.y} stroke="var(--parchment-dim)" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
            <line x1={hx} y1={hy} x2={v2.x} y2={v2.y} stroke="var(--parchment-dim)" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
            <circle cx={hx} cy={hy} r={15} fill="var(--walnut)" stroke={harborColor(harbor.type)} strokeWidth={2} />
            <text
              x={hx}
              y={hy}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={700}
              fontSize={9}
              fill="var(--parchment)"
            >
              {HARBOR_RATIO[harbor.type]}
            </text>
          </g>
        );
      })}

      {/* Roads */}
      {board.edges.map((edge) => {
        const v1 = vertexById.get(edge.v1)!;
        const v2 = vertexById.get(edge.v2)!;
        const gem = edge.road ? getGem(gemBySlot.get(edge.road.playerId) ?? null) : undefined;
        return (
          <g key={edge.id}>
            {edge.road && (
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke={gem ? gem.c2 : 'var(--brass)'}
                strokeWidth={7}
                strokeLinecap="round"
              />
            )}
            {edgeInteractive && (
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke="transparent"
                strokeWidth={16}
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
            {vertexInteractive && (
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={12}
                fill={vertex.building ? 'transparent' : 'rgba(237,225,200,.16)'}
                stroke={currentPlayerGem ? getGem(currentPlayerGem)?.c2 : 'var(--brass)'}
                strokeWidth={vertex.building ? 0 : 1}
                strokeDasharray={vertex.building ? undefined : '2 2'}
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
