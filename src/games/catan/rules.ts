import type { Board } from './types';

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

function neighborVertexIds(board: Board, vertexId: number): number[] {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return [];
  return vertex.edgeIds.map((edgeId) => {
    const edge = board.edges.find((e) => e.id === edgeId)!;
    return edge.v1 === vertexId ? edge.v2 : edge.v1;
  });
}

/** The distance rule: no settlement/city may be built on a vertex adjacent to another building. */
export function canPlaceSettlement(board: Board, vertexId: number): PlacementResult {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (vertex.building) return { valid: false, reason: 'That spot is already built on.' };

  const tooClose = neighborVertexIds(board, vertexId).some(
    (id) => board.vertices.find((v) => v.id === id)?.building,
  );
  if (tooClose) {
    return { valid: false, reason: 'Too close to another building — settlements must be at least two edges apart.' };
  }

  return { valid: true };
}

export function canUpgradeToCity(board: Board, vertexId: number, playerSlot: number): PlacementResult {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (!vertex.building) return { valid: false, reason: 'Place a settlement here first before upgrading it to a city.' };
  if (vertex.building.type === 'city') return { valid: false, reason: 'This is already a city.' };
  if (vertex.building.playerId !== playerSlot) return { valid: false, reason: 'You can only upgrade your own settlement.' };
  return { valid: true };
}

export function canPlaceRoad(board: Board, edgeId: number): PlacementResult {
  const edge = board.edges.find((e) => e.id === edgeId);
  if (!edge) return { valid: false, reason: 'Unknown edge.' };
  if (edge.road) return { valid: false, reason: 'There is already a road on that edge.' };
  return { valid: true };
}
