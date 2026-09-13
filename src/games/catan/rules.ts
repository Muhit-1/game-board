import type { Board } from './types';

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

/** Official Catan physical-piece supply limits, per player. */
export const PIECE_LIMITS = { settlements: 5, cities: 4, roads: 15 };

function neighborVertexIds(board: Board, vertexId: number): number[] {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return [];
  return vertex.edgeIds.map((edgeId) => {
    const edge = board.edges.find((e) => e.id === edgeId)!;
    return edge.v1 === vertexId ? edge.v2 : edge.v1;
  });
}

function countSettlements(board: Board, playerSlot: number): number {
  return board.vertices.filter((v) => v.building?.playerId === playerSlot && v.building.type === 'settlement').length;
}

function countCities(board: Board, playerSlot: number): number {
  return board.vertices.filter((v) => v.building?.playerId === playerSlot && v.building.type === 'city').length;
}

function countRoads(board: Board, playerSlot: number): number {
  return board.edges.filter((e) => e.road?.playerId === playerSlot).length;
}

/** The distance rule, plus the player's physical settlement-piece supply limit. */
export function canPlaceSettlement(board: Board, vertexId: number, playerSlot: number): PlacementResult {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (vertex.building) return { valid: false, reason: 'That spot is already built on.' };

  const tooClose = neighborVertexIds(board, vertexId).some(
    (id) => board.vertices.find((v) => v.id === id)?.building,
  );
  if (tooClose) {
    return { valid: false, reason: 'Too close to another building — settlements must be at least two edges apart.' };
  }

  if (countSettlements(board, playerSlot) >= PIECE_LIMITS.settlements) {
    return {
      valid: false,
      reason: `You've placed all ${PIECE_LIMITS.settlements} of your settlements — upgrade one to a city to free a piece, or Erase one.`,
    };
  }

  return { valid: true };
}

export function canUpgradeToCity(board: Board, vertexId: number, playerSlot: number): PlacementResult {
  const vertex = board.vertices.find((v) => v.id === vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (!vertex.building) return { valid: false, reason: 'Place a settlement here first before upgrading it to a city.' };
  if (vertex.building.type === 'city') return { valid: false, reason: 'This is already a city.' };
  if (vertex.building.playerId !== playerSlot) return { valid: false, reason: 'You can only upgrade your own settlement.' };

  if (countCities(board, playerSlot) >= PIECE_LIMITS.cities) {
    return { valid: false, reason: `You've placed all ${PIECE_LIMITS.cities} of your cities.` };
  }

  return { valid: true };
}

export function canPlaceRoad(board: Board, edgeId: number, playerSlot: number): PlacementResult {
  const edge = board.edges.find((e) => e.id === edgeId);
  if (!edge) return { valid: false, reason: 'Unknown edge.' };
  if (edge.road) return { valid: false, reason: 'There is already a road on that edge.' };

  if (countRoads(board, playerSlot) >= PIECE_LIMITS.roads) {
    return { valid: false, reason: `You've placed all ${PIECE_LIMITS.roads} of your roads.` };
  }

  return { valid: true };
}
