import type { Board, BoardKind, Edge, HarborType, Hex, ResourceType, Vertex } from '../types';
import { BOARD_CONFIGS } from './boardConfig';
import { HEX_WIDTH, hexCenter, hexCorners, pointKey } from './geometry';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resourcePool(kind: BoardKind): ResourceType[] {
  const pool: ResourceType[] = [];
  (Object.entries(BOARD_CONFIGS[kind].resources) as [ResourceType, number][]).forEach(([resource, count]) => {
    for (let i = 0; i < count; i++) pool.push(resource);
  });
  return pool;
}

function numberPool(kind: BoardKind): number[] {
  const pool: number[] = [];
  Object.entries(BOARD_CONFIGS[kind].tokens).forEach(([num, count]) => {
    for (let i = 0; i < count; i++) pool.push(Number(num));
  });
  return pool;
}

function isRed(number: number | null): boolean {
  return number === 6 || number === 8;
}

/** Official setup advice: two red (6/8) tokens should never sit on neighbouring hexes. */
function hasAdjacentRedNumbers(hexes: { x: number; y: number; number: number | null }[]): boolean {
  const red = hexes.filter((h) => isRed(h.number));
  for (let i = 0; i < red.length; i++) {
    for (let j = i + 1; j < red.length; j++) {
      if (Math.hypot(red[i].x - red[j].x, red[i].y - red[j].y) < HEX_WIDTH * 1.1) return true;
    }
  }
  return false;
}

export function generateBoard(kind: BoardKind): Board {
  const config = BOARD_CONFIGS[kind];

  const layout: { row: number; col: number; x: number; y: number }[] = [];
  config.rows.forEach((count, row) => {
    for (let col = 0; col < count; col++) layout.push({ row, col, ...hexCenter(config.rows, row, col) });
  });

  let assigned: { resource: ResourceType; number: number | null }[] = [];
  for (let attempt = 0; attempt < 300; attempt++) {
    const resources = shuffle(resourcePool(kind));
    const numbers = shuffle(numberPool(kind));
    assigned = resources.map((resource) => ({ resource, number: resource === 'desert' ? null : numbers.pop()! }));
    if (!hasAdjacentRedNumbers(layout.map((l, i) => ({ ...l, number: assigned[i].number })))) break;
  }

  const hexes: Hex[] = [];
  const vertexByKey = new Map<string, Vertex>();
  const edgeByKey = new Map<string, Edge>();
  let vertexIdSeq = 0;
  let edgeIdSeq = 0;

  layout.forEach((spot, hexId) => {
    const { resource, number } = assigned[hexId];
    const corners = hexCorners(spot);

    const vertexIds: number[] = [];
    corners.forEach((corner) => {
      const key = pointKey(corner);
      let vertex = vertexByKey.get(key);
      if (!vertex) {
        vertex = { id: vertexIdSeq++, x: corner.x, y: corner.y, hexIds: [], edgeIds: [], building: null };
        vertexByKey.set(key, vertex);
      }
      vertex.hexIds.push(hexId);
      vertexIds.push(vertex.id);
    });

    const edgeIds: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = vertexIds[i];
      const b = vertexIds[(i + 1) % 6];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      let edge = edgeByKey.get(key);
      if (!edge) {
        edge = { id: edgeIdSeq++, v1: a, v2: b, hexIds: [], road: null };
        edgeByKey.set(key, edge);
      }
      edge.hexIds.push(hexId);
      edgeIds.push(edge.id);
    }

    hexes.push({ id: hexId, row: spot.row, col: spot.col, resource, number, x: spot.x, y: spot.y, vertexIds, edgeIds });
  });

  const vertices = [...vertexByKey.values()].sort((a, b) => a.id - b.id);
  vertices.forEach((v) => {
    const edgeIdSet = new Set<number>();
    edgeByKey.forEach((e) => {
      if (e.v1 === v.id || e.v2 === v.id) edgeIdSet.add(e.id);
    });
    v.edgeIds = [...edgeIdSet];
  });
  const edges = [...edgeByKey.values()].sort((a, b) => a.id - b.id);

  const centroid = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x / vertices.length, y: acc.y + v.y / vertices.length }),
    { x: 0, y: 0 },
  );

  const boundaryEdges = edges.filter((e) => e.hexIds.length === 1);
  const withAngle = boundaryEdges.map((edge) => {
    const v1 = vertices.find((v) => v.id === edge.v1)!;
    const v2 = vertices.find((v) => v.id === edge.v2)!;
    const mx = (v1.x + v2.x) / 2;
    const my = (v1.y + v2.y) / 2;
    // Sort by angle around the board centroid purely to pick evenly-spaced boundary edges below.
    const sortAngle = Math.atan2(my - centroid.y, mx - centroid.x);
    // The rendering direction must point away from this edge's OWN hex, not the board centroid —
    // on this board's non-convex outline, the centroid direction can point back across the coast,
    // landing the harbor marker on top of a neighboring hex instead of floating just offshore.
    const ownerHex = hexes.find((h) => h.id === edge.hexIds[0])!;
    const outwardAngle = Math.atan2(my - ownerHex.y, mx - ownerHex.x);
    return { edge, sortAngle, outwardAngle };
  });
  withAngle.sort((a, b) => a.sortAngle - b.sortAngle);

  const harborTypes: HarborType[] = shuffle(config.harbors);
  const harbors: Board['harbors'] = [];
  const usedVertices = new Set<number>();
  const step = withAngle.length / harborTypes.length;
  let cursor = 0;
  for (let i = 0; i < harborTypes.length && cursor < withAngle.length * 2; ) {
    const candidate = withAngle[Math.floor(cursor) % withAngle.length];
    const sharesVertex = usedVertices.has(candidate.edge.v1) || usedVertices.has(candidate.edge.v2);
    if (!sharesVertex) {
      harbors.push({ id: i, edgeId: candidate.edge.id, type: harborTypes[i], angle: candidate.outwardAngle });
      usedVertices.add(candidate.edge.v1);
      usedVertices.add(candidate.edge.v2);
      i++;
      cursor += step;
    } else {
      cursor += 1;
    }
  }

  const desertHexes = hexes.filter((h) => h.resource === 'desert');
  const robberHexId = desertHexes[Math.floor(Math.random() * desertHexes.length)].id;

  return { hexes, vertices, edges, harbors, robberHexId };
}
