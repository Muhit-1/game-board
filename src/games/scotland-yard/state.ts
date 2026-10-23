import type { GameState, LogEntry, MoveTicket, Player, Snapshot, Tickets, Winner } from './types';
import type { TableThemeId } from '../../shared/theme/tableThemes';
import { DETECTIVE_STARTS, MRX_STARTS, REVEAL_ROUNDS, TOTAL_ROUNDS } from './data/graph';
import { DETECTIVE_START_TICKETS, detectiveMoves, detectivesOf, mrXMoves, mrXOf, mrXStartTickets, validateDetectiveMove, validateMrXMove } from './rules';
import { loadLook } from './prefs';

export type { GameState } from './types';

export const MAX_NAME_LENGTH = 14;
const HISTORY_LIMIT = 200;

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    positions: {},
    tickets: {},
    log: [],
    lastSeen: null,
    turn: { side: 'mrx' },
    doublePending: false,
    winner: null,
    tableTheme: loadLook().tableTheme,
    skipNotice: null,
    revealEvent: null,
    turnCue: 0,
    eventSeq: 0,
    history: [],
  };
}

export type GameAction =
  | { type: 'START_GAME'; players: Player[] }
  | { type: 'RESHUFFLE_STARTS' }
  | { type: 'BEGIN_GAME' }
  | { type: 'SET_PLAYER_GEM'; slot: number; gem: string }
  | { type: 'REORDER_PLAYERS'; slot: number; toIndex: number }
  | { type: 'RENAME_PLAYER'; slot: number; name: string }
  | { type: 'MRX_MOVE'; station: number; ticket: MoveTicket; double?: boolean }
  | { type: 'DETECTIVE_MOVE'; station: number; ticket: MoveTicket }
  | { type: 'UNDO' }
  | { type: 'NEW_GAME' }
  | { type: 'SET_TABLE_THEME'; theme: TableThemeId };

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Random start stations from the start cards, and everyone's starting tickets. */
function dealStarts(players: Player[]): Pick<GameState, 'positions' | 'tickets'> {
  const detectives = detectivesOf(players);
  const starts = shuffle(DETECTIVE_STARTS);
  const positions: Record<number, number> = {};
  const tickets: Record<number, Tickets> = {};
  detectives.forEach((d, i) => {
    positions[d.slot] = starts[i];
    tickets[d.slot] = { ...DETECTIVE_START_TICKETS };
  });
  const mrX = mrXOf(players);
  positions[mrX.slot] = shuffle(MRX_STARTS)[0];
  tickets[mrX.slot] = mrXStartTickets(detectives.length);
  return { positions, tickets };
}

function snapshot(state: GameState): Snapshot {
  return {
    phase: state.phase,
    positions: state.positions,
    tickets: state.tickets,
    log: state.log,
    lastSeen: state.lastSeen,
    turn: state.turn,
    doublePending: state.doublePending,
    winner: state.winner,
  };
}

function withHistory(state: GameState): GameState {
  return { ...state, history: [...state.history.slice(-(HISTORY_LIMIT - 1)), snapshot(state)] };
}

function finish(state: GameState, winner: Omit<Winner, 'station'>): GameState {
  const station = state.positions[mrXOf(state.players).slot];
  return { ...state, phase: 'finished', winner: { ...winner, station }, eventSeq: state.eventSeq + 1 };
}

/** The first detective at or after `startIndex` (turn order) who can actually move; the others are skipped. */
function nextMovingDetective(state: GameState, startIndex: number): { slot: number | null; skipped: number[] } {
  const detectives = detectivesOf(state.players);
  const skipped: number[] = [];
  for (let i = startIndex; i < detectives.length; i++) {
    if (detectiveMoves(state, detectives[i].slot).length > 0) return { slot: detectives[i].slot, skipped };
    skipped.push(detectives[i].slot);
  }
  return { slot: null, skipped };
}

function withSkips(state: GameState, skipped: number[]): GameState {
  if (skipped.length === 0) return state;
  const eventSeq = state.eventSeq + 1;
  return { ...state, eventSeq, skipNotice: { id: eventSeq, slots: skipped } };
}

/** After Mr. X's turn is over: the detectives move one by one. */
function startDetectives(state: GameState): GameState {
  const next = nextMovingDetective(state, 0);
  if (next.slot === null) return finish(withSkips(state, next.skipped), { side: 'mrx', reason: 'stuck', by: null });
  return withSkips({ ...state, turn: { side: 'detective', slot: next.slot }, turnCue: state.turnCue + 1 }, next.skipped);
}

/** After a detective has moved: the next detective, or — when all have moved — the next round (or the end of the game). */
function afterDetective(state: GameState, slot: number): GameState {
  const detectives = detectivesOf(state.players);
  const index = detectives.findIndex((d) => d.slot === slot);
  const next = nextMovingDetective(state, index + 1);
  if (next.slot !== null) {
    return withSkips({ ...state, turn: { side: 'detective', slot: next.slot }, turnCue: state.turnCue + 1 }, next.skipped);
  }
  const base = withSkips(state, next.skipped);
  if (base.log.length >= TOTAL_ROUNDS) return finish(base, { side: 'mrx', reason: 'escaped', by: null });
  if (mrXMoves(base).length === 0) return finish(base, { side: 'detectives', reason: 'trapped', by: null });
  return { ...base, turn: { side: 'mrx' }, turnCue: base.turnCue + 1 };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, phase: 'arrange', players: action.players, ...dealStarts(action.players), log: [], lastSeen: null, turn: { side: 'mrx' }, doublePending: false, winner: null, history: [] };

    case 'RESHUFFLE_STARTS':
      if (state.phase !== 'arrange') return state;
      return { ...state, ...dealStarts(state.players) };

    case 'BEGIN_GAME':
      if (state.phase !== 'arrange') return state;
      return { ...state, phase: 'playing', turn: { side: 'mrx' }, turnCue: state.turnCue + 1, history: [] };

    case 'SET_PLAYER_GEM': {
      const mine = state.players.find((p) => p.slot === action.slot);
      if (!mine || mine.gem === action.gem) return state;
      const holder = state.players.find((p) => p.gem === action.gem);
      return {
        ...state,
        players: state.players.map((p) => {
          if (p.slot === action.slot) return { ...p, gem: action.gem };
          if (holder && p.slot === holder.slot) return { ...p, gem: mine.gem };
          return p;
        }),
      };
    }

    case 'REORDER_PLAYERS': {
      const from = state.players.findIndex((p) => p.slot === action.slot);
      if (from < 0) return state;
      const to = Math.max(0, Math.min(state.players.length - 1, action.toIndex));
      if (from === to) return state;
      const players = [...state.players];
      const [moved] = players.splice(from, 1);
      players.splice(to, 0, moved);
      return { ...state, players };
    }

    case 'RENAME_PLAYER': {
      const name = action.name.trim().slice(0, MAX_NAME_LENGTH) || `Player ${action.slot + 1}`;
      return { ...state, players: state.players.map((p) => (p.slot === action.slot ? { ...p, name } : p)) };
    }

    case 'MRX_MOVE': {
      if (state.phase !== 'playing' || state.turn.side !== 'mrx') return state;
      if (!validateMrXMove(state, action.station, action.ticket).valid) return state;
      const mrX = mrXOf(state.players);
      const startsDouble = !!action.double && !state.doublePending && state.tickets[mrX.slot].double > 0 && state.log.length <= TOTAL_ROUNDS - 2;
      const round = state.log.length + 1;
      const revealed = REVEAL_ROUNDS.includes(round) ? action.station : null;
      const entry: LogEntry = { round, ticket: action.ticket, double: startsDouble || state.doublePending, revealed };
      const mrXTickets = state.tickets[mrX.slot];
      const eventSeq = state.eventSeq + 1;
      let next: GameState = withHistory(state);
      next = {
        ...next,
        positions: { ...state.positions, [mrX.slot]: action.station },
        tickets: {
          ...state.tickets,
          [mrX.slot]: {
            ...mrXTickets,
            black: mrXTickets.black - (action.ticket === 'black' ? 1 : 0),
            double: mrXTickets.double - (startsDouble ? 1 : 0),
          },
        },
        log: [...state.log, entry],
        lastSeen: revealed !== null ? { station: revealed, round } : state.lastSeen,
        revealEvent: revealed !== null ? { id: eventSeq, round, station: revealed } : state.revealEvent,
        eventSeq: revealed !== null ? eventSeq : state.eventSeq,
        doublePending: startsDouble,
      };
      if (startsDouble) {
        // The second move of the double is still to come; if there is nowhere left to go, Mr. X is trapped.
        return mrXMoves(next).length === 0 ? finish(next, { side: 'detectives', reason: 'trapped', by: null }) : next;
      }
      return startDetectives(next);
    }

    case 'DETECTIVE_MOVE': {
      if (state.phase !== 'playing' || state.turn.side !== 'detective') return state;
      const slot = state.turn.slot;
      if (!validateDetectiveMove(state, slot, action.station, action.ticket).valid) return state;
      const mrX = mrXOf(state.players);
      let next = withHistory(state);
      next = {
        ...next,
        positions: { ...state.positions, [slot]: action.station },
        tickets: { ...state.tickets, [slot]: { ...state.tickets[slot], [action.ticket]: state.tickets[slot][action.ticket as 'taxi' | 'bus' | 'ug'] - 1 } },
      };
      if (action.station === state.positions[mrX.slot]) return finish(next, { side: 'detectives', reason: 'caught', by: slot });
      return afterDetective(next, slot);
    }

    case 'UNDO': {
      const last = state.history[state.history.length - 1];
      if (!last || (state.phase !== 'playing' && state.phase !== 'finished')) return state;
      return { ...state, ...last, history: state.history.slice(0, -1), turnCue: state.turnCue + 1 };
    }

    case 'NEW_GAME':
      return { ...createInitialState(), tableTheme: state.tableTheme, eventSeq: state.eventSeq, turnCue: state.turnCue };

    case 'SET_TABLE_THEME':
      return { ...state, tableTheme: action.theme };

    default:
      return state;
  }
}
