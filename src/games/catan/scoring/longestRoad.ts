import type { Board, Edge } from '../types';

const MIN_LONGEST_ROAD = 5;

/**
 * Longest simple trail (no repeated edge) through a set of road edges, via DFS with backtracking.
 * A vertex in `blocked` (another player's building) can end a road but never be passed through.
 */
export function longestTrailLength(playerEdges: Edge[], blocked: Set<number> = new Set()): number {
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
    if (length > 0 && blocked.has(vertex)) return;
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

export interface LongestRoadResult {
  holder: number | null;
  lengths: Record<number, number>;
}

/**
 * Who holds Longest Road. Needs 5+ connected roads; the longest wins. On a tie the current holder
 * keeps the title if they're among the leaders, otherwise nobody holds it.
 */
export function computeLongestRoad(board: Board, playerSlots: number[], previousHolder: number | null): LongestRoadResult {
  const lengths: Record<number, number> = {};
  playerSlots.forEach((slot) => {
    const blocked = new Set<number>();
    board.vertices.forEach((v) => {
      if (v.building && v.building.playerId !== slot) blocked.add(v.id);
    });
    lengths[slot] = longestTrailLength(
      board.edges.filter((e) => e.road?.playerId === slot),
      blocked,
    );
  });

  const qualifying = playerSlots.filter((slot) => lengths[slot] >= MIN_LONGEST_ROAD);
  if (qualifying.length === 0) return { holder: null, lengths };

  const max = Math.max(...qualifying.map((slot) => lengths[slot]));
  const leaders = qualifying.filter((slot) => lengths[slot] === max);
  if (leaders.length === 1) return { holder: leaders[0], lengths };
  return { holder: previousHolder !== null && leaders.includes(previousHolder) ? previousHolder : null, lengths };
}
