import type { GameState, Move, MoveTicket, Player, Tickets, Transport } from './types';
import { neighbours, TRANSPORTS } from './data/graph';

export interface MoveResult {
  valid: boolean;
  reason?: string;
}

export const DETECTIVE_START_TICKETS: Tickets = { taxi: 10, bus: 8, ug: 4, black: 0, double: 0 };

/** Mr. X's normal tickets are unlimited (he collects every ticket the detectives spend), so only black and double are counted. */
export function mrXStartTickets(detectiveCount: number): Tickets {
  return { taxi: 99, bus: 99, ug: 99, black: detectiveCount, double: 2 };
}

/** The ticket that pays for a transport (ferries can only be paid with black). */
function ticketFor(transport: Transport): MoveTicket | null {
  return transport === 'ferry' ? null : transport;
}

export const detectivesOf = (players: Player[]) => players.filter((p) => p.role === 'detective');
export const mrXOf = (players: Player[]) => players.find((p) => p.role === 'mrx')!;

function occupiedByDetective(state: Pick<GameState, 'players' | 'positions'>, station: number, exceptSlot?: number): boolean {
  return detectivesOf(state.players).some((p) => p.slot !== exceptSlot && state.positions[p.slot] === station);
}

/** Every move a detective could make from where they stand, with the tickets they have left. */
export function detectiveMoves(state: Pick<GameState, 'players' | 'positions' | 'tickets'>, slot: number): Move[] {
  const from = state.positions[slot];
  const tickets = state.tickets[slot];
  const moves: Move[] = [];
  for (const transport of TRANSPORTS) {
    const ticket = ticketFor(transport);
    if (!ticket || tickets[ticket] <= 0) continue;
    for (const station of neighbours(from, transport)) {
      if (!occupiedByDetective(state, station, slot)) moves.push({ station, ticket, transport });
    }
  }
  return moves;
}

export function validateDetectiveMove(state: GameState, slot: number, station: number, ticket: MoveTicket): MoveResult {
  const found = detectiveMoves(state, slot).some((m) => m.station === station && m.ticket === ticket);
  if (found) return { valid: true };
  const from = state.positions[slot];
  if (occupiedByDetective(state, station, slot)) return { valid: false, reason: 'Another detective is already standing there.' };
  if (state.tickets[slot][ticket] <= 0) return { valid: false, reason: `No ${ticketName(ticket)} tickets left.` };
  return { valid: false, reason: `There is no ${ticketName(ticket)} link from ${from} to ${station}.` };
}

/** Every move Mr. X could make now (used to spot when he is trapped, never shown). */
export function mrXMoves(state: Pick<GameState, 'players' | 'positions' | 'tickets'>): Move[] {
  const mrX = mrXOf(state.players);
  const from = state.positions[mrX.slot];
  const tickets = state.tickets[mrX.slot];
  const moves: Move[] = [];
  for (const transport of TRANSPORTS) {
    const normal = ticketFor(transport);
    const ticketsToTry: MoveTicket[] = [];
    if (normal && tickets[normal] > 0) ticketsToTry.push(normal);
    if (tickets.black > 0) ticketsToTry.push('black');
    for (const station of neighbours(from, transport)) {
      if (occupiedByDetective(state, station)) continue;
      ticketsToTry.forEach((ticket) => moves.push({ station, ticket, transport }));
    }
  }
  return moves;
}

/** Deliberately vague on failure: the pad must not hint at where Mr. X could go. */
export function validateMrXMove(state: GameState, station: number, ticket: MoveTicket): MoveResult {
  const ok = mrXMoves(state).some((m) => m.station === station && m.ticket === ticket);
  return ok ? { valid: true } : { valid: false, reason: "You can't go there with that ticket." };
}

export function ticketName(ticket: MoveTicket): string {
  return { taxi: 'taxi', bus: 'bus', ug: 'underground', black: 'black' }[ticket];
}
