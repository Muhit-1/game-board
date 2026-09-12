import type { Edge } from '../types';

const MIN_LONGEST_ROAD = 5;

/** Longest simple trail (no repeated edge) through a set of road edges, via DFS with backtracking. */
export function longestTrailLength(playerEdges: Edge[]): number {
  if (playerEdges.length === 0) return 0;

  const adjacency = new Map<number, { edgeId: number; other: number }[]>();
  playerEdges.forEach((edge) => {
    if (!adjacency.has(edge.v1)) adjacency.set(edge.v1, []);
    if (!adjacency.has(edge.v2)) adjacency.set(edge.v2, []);
    adjacency.get(edge.v1)!.push({ edgeId: edge.id, other: edge.v2 });
    adjacency.get(edge.v2)!.push({ edgeId: edge.id, other: edge.v1 });
  });

  let best = 0;
  const visitedEdges = new Set<number>();

  function dfs(vertex: number, length: number) {
    best = Math.max(best, length);
    for (const { edgeId, other } of adjacency.get(vertex) ?? []) {
      if (visitedEdges.has(edgeId)) continue;
      visitedEdges.add(edgeId);
      dfs(other, length + 1);
      visitedEdges.delete(edgeId);
    }
  }

  for (const startVertex of adjacency.keys()) {
    dfs(startVertex, 0);
  }

  return best;
}

/** The player currently holding Longest Road, or null if nobody qualifies or two+ players are tied. */
export function computeLongestRoadHolder(edges: Edge[], playerSlots: number[]): number | null {
  const lengths = playerSlots.map((slot) => ({
    slot,
    length: longestTrailLength(edges.filter((e) => e.road?.playerId === slot)),
  }));

  const qualifying = lengths.filter((l) => l.length >= MIN_LONGEST_ROAD);
  if (qualifying.length === 0) return null;

  const max = Math.max(...qualifying.map((l) => l.length));
  const leaders = qualifying.filter((l) => l.length === max);
  return leaders.length === 1 ? leaders[0].slot : null;
}
