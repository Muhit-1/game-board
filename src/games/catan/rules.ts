import type { Board, Edge, Vertex } from './types';

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

/** Official Catan physical-piece supply limits, per player. */
export const PIECE_LIMITS = { settlements: 5, cities: 4, roads: 15 };

interface PieceCounts {
  settlements: number;
  cities: number;
  roads: number;
}

interface BoardIndex {
  vertexById: Map<number, Vertex>;
  edgeById: Map<number, Edge>;
  counts: Map<number, PieceCounts>;
}

/**
 * Lookup tables for one board snapshot. The legal-spot overlay asks about every vertex/edge on each
 * change, so the tables are built once per board object and reused rather than scanning arrays per query.
 */
const indexCache = new WeakMap<Board, BoardIndex>();

function indexOf(board: Board): BoardIndex {
  let index = indexCache.get(board);
  if (index) return index;

  const counts = new Map<number, PieceCounts>();
  const countsFor = (slot: number) => {
    let c = counts.get(slot);
    if (!c) counts.set(slot, (c = { settlements: 0, cities: 0, roads: 0 }));
    return c;
  };
  board.vertices.forEach((v) => {
    if (!v.building) return;
    countsFor(v.building.playerId)[v.building.type === 'city' ? 'cities' : 'settlements']++;
  });
  board.edges.forEach((e) => {
    if (e.road) countsFor(e.road.playerId).roads++;
  });

  index = {
    vertexById: new Map(board.vertices.map((v) => [v.id, v])),
    edgeById: new Map(board.edges.map((e) => [e.id, e])),
    counts,
  };
  indexCache.set(board, index);
  return index;
}

function countsOf(index: BoardIndex, slot: number): PieceCounts {
  return index.counts.get(slot) ?? { settlements: 0, cities: 0, roads: 0 };
}

function otherEnd(edge: Edge, vertexId: number): number {
  return edge.v1 === vertexId ? edge.v2 : edge.v1;
}

/**
 * The distance rule, the piece supply limit, and — once opening placement is over — the rule that a
 * new settlement must sit at the end of one of the player's own roads.
 */
export function canPlaceSettlement(board: Board, vertexId: number, playerSlot: number, opening = false): PlacementResult {
  const index = indexOf(board);
  const vertex = index.vertexById.get(vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (vertex.building) return { valid: false, reason: 'That spot is already built on.' };

  const tooClose = vertex.edgeIds.some((edgeId) => {
    const edge = index.edgeById.get(edgeId)!;
    return index.vertexById.get(otherEnd(edge, vertexId))?.building;
  });
  if (tooClose) {
    return { valid: false, reason: 'Too close to another building — settlements must be at least two edges apart.' };
  }

  if (countsOf(index, playerSlot).settlements >= PIECE_LIMITS.settlements) {
    return {
      valid: false,
      reason: `You've placed all ${PIECE_LIMITS.settlements} of your settlements — upgrade one to a city to free a piece, or Erase one.`,
    };
  }

  if (!opening) {
    const touchesOwnRoad = vertex.edgeIds.some((edgeId) => index.edgeById.get(edgeId)?.road?.playerId === playerSlot);
    if (!touchesOwnRoad) {
      return { valid: false, reason: 'A settlement must connect to one of your own roads.' };
    }
  }

  return { valid: true };
}

export function canUpgradeToCity(board: Board, vertexId: number, playerSlot: number): PlacementResult {
  const index = indexOf(board);
  const vertex = index.vertexById.get(vertexId);
  if (!vertex) return { valid: false, reason: 'Unknown vertex.' };
  if (!vertex.building) return { valid: false, reason: 'Place a settlement here first before upgrading it to a city.' };
  if (vertex.building.type === 'city') return { valid: false, reason: 'This is already a city.' };
  if (vertex.building.playerId !== playerSlot) return { valid: false, reason: 'You can only upgrade your own settlement.' };

  if (countsOf(index, playerSlot).cities >= PIECE_LIMITS.cities) {
    return { valid: false, reason: `You've placed all ${PIECE_LIMITS.cities} of your cities.` };
  }

  return { valid: true };
}

/** A road connects at an end if that end holds the player's own building, or an own road with no enemy building in the way. */
function roadConnects(index: BoardIndex, edge: Edge, playerSlot: number): boolean {
  return [edge.v1, edge.v2].some((vertexId) => {
    const vertex = index.vertexById.get(vertexId)!;
    if (vertex.building) return vertex.building.playerId === playerSlot;
    return vertex.edgeIds.some((edgeId) => edgeId !== edge.id && index.edgeById.get(edgeId)?.road?.playerId === playerSlot);
  });
}

/**
 * `openingVertexId` is set during opening placement: the road must touch the settlement just placed.
 * In normal play it is null and the road must connect to the player's own network instead.
 */
export function canPlaceRoad(board: Board, edgeId: number, playerSlot: number, openingVertexId: number | null = null): PlacementResult {
  const index = indexOf(board);
  const edge = index.edgeById.get(edgeId);
  if (!edge) return { valid: false, reason: 'Unknown edge.' };
  if (edge.road) return { valid: false, reason: 'There is already a road on that edge.' };

  if (countsOf(index, playerSlot).roads >= PIECE_LIMITS.roads) {
    return { valid: false, reason: `You've placed all ${PIECE_LIMITS.roads} of your roads.` };
  }

  if (openingVertexId !== null) {
    if (edge.v1 !== openingVertexId && edge.v2 !== openingVertexId) {
      return { valid: false, reason: 'Place this road right next to the settlement you just placed.' };
    }
    return { valid: true };
  }

  if (!roadConnects(index, edge, playerSlot)) {
    return { valid: false, reason: 'A road must connect to your own roads or settlements (and can’t pass through another player’s building).' };
  }

  return { valid: true };
}
