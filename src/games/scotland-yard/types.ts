import type { TableThemeId } from '../../shared/theme/tableThemes';

/** How a link on the map is travelled. Ferries need a black ticket. */
export type Transport = 'taxi' | 'bus' | 'ug' | 'ferry';

/** The ticket a move is paid with (and what the travel log shows). */
export type MoveTicket = 'taxi' | 'bus' | 'ug' | 'black';

export interface Tickets {
  taxi: number;
  bus: number;
  ug: number;
  black: number;
  double: number;
}

export type Role = 'mrx' | 'detective';

export interface Player {
  slot: number;
  name: string;
  /** Gem id, used as the player's colour. */
  gem: string;
  role: Role;
}

export interface Move {
  station: number;
  ticket: MoveTicket;
  transport: Transport;
}

/** One cell of Mr. X's travel log. Only the ticket is public; the station is shown on reveal rounds. */
export interface LogEntry {
  round: number;
  ticket: MoveTicket;
  /** Part of a double move. */
  double: boolean;
  revealed: number | null;
}

export interface LastSeen {
  station: number;
  round: number;
}

/** 'setup' = names + who is Mr. X; 'arrange' = on the board: colours and detective order; then play. */
export type Phase = 'setup' | 'arrange' | 'playing' | 'finished';

export type Turn = { side: 'mrx' } | { side: 'detective'; slot: number };

export interface Winner {
  side: 'detectives' | 'mrx';
  reason: 'caught' | 'trapped' | 'escaped' | 'stuck';
  /** Where Mr. X was, revealed at the end. */
  station: number;
  /** The detective who made the capture. */
  by: number | null;
}

export interface Snapshot {
  phase: Phase;
  positions: Record<number, number>;
  tickets: Record<number, Tickets>;
  log: LogEntry[];
  lastSeen: LastSeen | null;
  turn: Turn;
  doublePending: boolean;
  winner: Winner | null;
}

export interface GameState extends Snapshot {
  /** Array order = turn order among the detectives. */
  players: Player[];
  tableTheme: TableThemeId;
  /** Detectives skipped because they had no legal move; `id` is monotonic so the UI shows each notice once. */
  skipNotice: { id: number; slots: number[] } | null;
  /** Bumped when Mr. X's position is revealed (rounds 3, 8, 13, 18, 24). */
  revealEvent: { id: number; round: number; station: number } | null;
  /** Bumped whenever the turn passes to someone new (drives the banner + sound). */
  turnCue: number;
  eventSeq: number;
  history: Snapshot[];
}
