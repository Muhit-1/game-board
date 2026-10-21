import { memo, useCallback, useMemo, useRef } from 'react';
import type { Board, BoardStyle, BuildMode, Hex, Player } from '../types';
import { getGem } from '../../../shared/theme/gems';
import { HEX_SIZE } from './geometry';
import { RESOURCE_COLORS, HARBOR_RATIO, harborColor } from './resourceColors';
import { computeViewBox } from './viewBox';
import { harborGeometry } from './harborGeometry';
import type { HarborGeometry } from './harborGeometry';
import { ClassicBase, ClassicBaseDefs } from './classic/ClassicBase';
import { ClassicCity, ClassicHouse, ClassicPieceDefs, ClassicRoad } from './classic/pieces';
import { useClassicAssets } from './classic/assets';
import { Skull } from '../../../shared/icons';

interface BoardViewProps {
  board: Board;
  players: Player[];
  buildMode: BuildMode;
  currentPlayerGem: string | null;
  /** 'tavern' = the original flat board, 'classic' = the illustrated board. Purely visual. */
  style: BoardStyle;
  /** Spots the current tool can legally act on — only these are marked; the rest still answer a tap with a hint. */
  legalVertexIds: Set<number>;
  legalEdgeIds: Set<number>;
  onVertexClick: (vertexId: number) => void;
  onEdgeClick: (edgeId: number) => void;
  onHexClick: (hexId: number) => void;
}

/**
 * The board's own colours. They are fixed on purpose: the table colour (page background) is chosen independently
 * and changes the UI variables, so the board must not read those. The one exception is the dashed harbour lines,
 * which sit on the table itself and so follow `--on-table-dim` to stay visible on every table colour.
 */
const INK = '#2b2016';
const PARCHMENT = '#ede1c8';
const EMBER = '#b5502e';
const BRASS = '#c9903f';
const WALNUT = '#3c2a1c';

/** Dots under a number token = how many of the 36 dice combinations roll it (7 is excluded). */
const PROBABILITY_DOTS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

function hexPolygonPoints(cx: number, cy: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`;
  }).join(' ');
}

/** Gradients for the tokens, the robber pawn and the painted pieces (shared by both board styles). */
function BoardDefs() {
  return (
    <defs>
      <ClassicBaseDefs />
      <ClassicPieceDefs />
    </defs>
  );
}

interface BoardBaseProps {
  hexes: Hex[];
  harbors: HarborGeometry[];
  robberHexId: number;
  hexInteractive: boolean;
  onHexClick: (hexId: number) => void;
}

/** The original flat board: hexes, number tokens, harbours and robber. Static between placements, so it's memoised. */
const BoardBase = memo(function BoardBase({ hexes, harbors, robberHexId, hexInteractive, onHexClick }: BoardBaseProps) {
  return (
    <>
      {hexes.map((hex) => {
        const red = hex.number === 6 || hex.number === 8;
        const tokenColor = red ? EMBER : INK;
        const dots = hex.number !== null ? PROBABILITY_DOTS[hex.number] : 0;
        return (
          <g key={hex.id} onClick={() => hexInteractive && onHexClick(hex.id)} style={{ cursor: hexInteractive ? 'crosshair' : 'default' }}>
            <polygon points={hexPolygonPoints(hex.x, hex.y)} fill={RESOURCE_COLORS[hex.resource]} stroke={INK} strokeWidth={3} />
            {hex.number !== null && (
              <g>
                <circle cx={hex.x} cy={hex.y} r={HEX_SIZE * 0.4} fill={PARCHMENT} stroke="rgba(0,0,0,.35)" strokeWidth={1} />
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
                <circle cx={14} cy={14} r={19} fill={INK} stroke={BRASS} strokeWidth={2} />
                <Skull x={4} y={4} width={20} height={20} color={PARCHMENT} strokeWidth={2} />
              </g>
            )}
          </g>
        );
      })}

      {harbors.map((harbor) => (
        <g key={harbor.id}>
          <line x1={harbor.x} y1={harbor.y} x2={harbor.ends[0]} y2={harbor.ends[1]} stroke="var(--on-table-dim, #d8cbae)" strokeWidth={1.8} strokeDasharray="3 4" opacity={0.85} />
          <line x1={harbor.x} y1={harbor.y} x2={harbor.ends[2]} y2={harbor.ends[3]} stroke="var(--on-table-dim, #d8cbae)" strokeWidth={1.8} strokeDasharray="3 4" opacity={0.85} />
          <circle cx={harbor.x} cy={harbor.y} r={23} fill={WALNUT} stroke={harborColor(harbor.type)} strokeWidth={2.5} />
          <text
            x={harbor.x}
            y={harbor.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={700}
            fontSize={13}
            fill={PARCHMENT}
          >
            {HARBOR_RATIO[harbor.type]}
          </text>
        </g>
      ))}
    </>
  );
});

export function BoardView({
  board,
  players,
  buildMode,
  currentPlayerGem,
  style,
  legalVertexIds,
  legalEdgeIds,
  onVertexClick,
  onEdgeClick,
  onHexClick,
}: BoardViewProps) {
  const classic = style === 'classic';
  const gemBySlot = useMemo(() => new Map(players.map((p) => [p.slot, p.gem])), [players]);
  const vb = useMemo(() => computeViewBox(board), [board.vertices]);
  const viewBox = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  const vertexById = useMemo(() => new Map(board.vertices.map((v) => [v.id, v])), [board.vertices]);
  const harbors = useMemo(() => harborGeometry(board, board.harbors), [board.harbors, board.hexes]);
  const classicAssets = useClassicAssets(board, classic);

  // A stable callback keeps the memoised base layers valid even though the parent re-creates its handlers every render.
  const hexClickRef = useRef(onHexClick);
  hexClickRef.current = onHexClick;
  const handleHexClick = useCallback((hexId: number) => hexClickRef.current(hexId), []);

  const vertexInteractive = buildMode === 'settlement' || buildMode === 'city' || buildMode === 'erase';
  const edgeInteractive = buildMode === 'road' || buildMode === 'erase';
  const hexInteractive = buildMode === 'robber';
  const glowColor = currentPlayerGem ? getGem(currentPlayerGem)?.glow : undefined;

  return (
    <svg viewBox={viewBox} className="h-full w-full select-none" style={{ touchAction: 'manipulation' }}>
      <BoardDefs />

      {classic ? (
        <ClassicBase
          hexes={board.hexes}
          variants={classicAssets.variants}
          version={classicAssets.version}
          tileUrl={classicAssets.tileUrl}
          seaUrl={classicAssets.seaUrl}
          harbors={harbors}
          robberHexId={board.robberHexId}
          vb={vb}
          hexInteractive={hexInteractive}
          onHexClick={handleHexClick}
        />
      ) : (
        <BoardBase hexes={board.hexes} harbors={harbors} robberHexId={board.robberHexId} hexInteractive={hexInteractive} onHexClick={handleHexClick} />
      )}

      {/* Roads */}
      {board.edges.map((edge) => {
        const v1 = vertexById.get(edge.v1)!;
        const v2 = vertexById.get(edge.v2)!;
        const gem = edge.road ? getGem(gemBySlot.get(edge.road.playerId) ?? null) : undefined;
        const legal = edgeInteractive && legalEdgeIds.has(edge.id);
        return (
          <g key={edge.id}>
            {edge.road && gem && <ClassicRoad a={v1} b={v2} gem={gem} />}
            {legal && (
              <line
                x1={v1.x}
                y1={v1.y}
                x2={v2.x}
                y2={v2.y}
                stroke={edge.road ? PARCHMENT : glowColor ?? '#e2b876'}
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
            {vertex.building && gem && (vertex.building.type === 'settlement' ? <ClassicHouse x={vertex.x} y={vertex.y} gem={gem} /> : <ClassicCity x={vertex.x} y={vertex.y} gem={gem} />)}
            {legal && (
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={vertex.building ? 16 : 11}
                fill={vertex.building ? 'transparent' : 'rgba(237,225,200,.22)'}
                stroke={glowColor ?? BRASS}
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
