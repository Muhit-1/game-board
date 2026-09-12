import type { Board, Edge, HarborType, Hex, ResourceType, Vertex } from '../types';
import { ROW_LAYOUT, hexCenter, hexCorners, pointKey } from './geometry';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resourcePool(): ResourceType[] {
  const pool: ResourceType[] = [];
  const counts: Record<ResourceType, number> = {
    forest: 6,
    pasture: 6,
    fields: 6,
    hills: 5,
    mountains: 5,
    desert: 2,
  };
  (Object.keys(counts) as ResourceType[]).forEach((resource) => {
    for (let i = 0; i < counts[resource]; i++) pool.push(resource);
  });
  return shuffle(pool);
}

function numberPool(): number[] {
  const counts: Record<number, number> = { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 };
  const pool: number[] = [];
  Object.entries(counts).forEach(([num, count]) => {
    for (let i = 0; i < count; i++) pool.push(Number(num));
  });
  return shuffle(pool);
}

function harborPool(): HarborType[] {
  const pool: HarborType[] = ['generic', 'generic', 'generic', 'generic', 'generic', 'wood', 'brick', 'ore', 'grain', 'wool', 'wool'];
  return shuffle(pool);
}

export function generateBoard(): Board {
  const resources = resourcePool();
  const numbers = numberPool();

  const hexes: Hex[] = [];
  const vertexByKey = new Map<string, Vertex>();
  const edgeByKey = new Map<string, Edge>();
  let vertexIdSeq = 0;
  let edgeIdSeq = 0;
  let hexIdSeq = 0;

  ROW_LAYOUT.forEach((count, row) => {
    for (let col = 0; col < count; col++) {
      const resource = resources.pop()!;
      const number = resource === 'desert' ? null : numbers.pop()!;
      const center = hexCenter(row, col);
      const corners = hexCorners(center);
      const hexId = hexIdSeq++;

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

      hexes.push({ id: hexId, row, col, resource, number, x: center.x, y: center.y, vertexIds, edgeIds });
    }
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
    return { edge, angle: Math.atan2(my - centroid.y, mx - centroid.x) };
  });
  withAngle.sort((a, b) => a.angle - b.angle);

  const harborTypes = harborPool();
  const harbors: Board['harbors'] = [];
  const usedVertices = new Set<number>();
  const step = withAngle.length / harborTypes.length;
  let cursor = 0;
  for (let i = 0; i < harborTypes.length && cursor < withAngle.length * 2; ) {
    const candidate = withAngle[Math.floor(cursor) % withAngle.length];
    const sharesVertex = usedVertices.has(candidate.edge.v1) || usedVertices.has(candidate.edge.v2);
    if (!sharesVertex) {
      harbors.push({ id: i, edgeId: candidate.edge.id, type: harborTypes[i], angle: candidate.angle });
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
