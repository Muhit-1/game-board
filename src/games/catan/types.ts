import type { TableThemeId } from '../../shared/theme/tableThemes';

export type ResourceType = 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';

export type HarborType = 'generic' | 'wood' | 'brick' | 'ore' | 'grain' | 'wool';

export type BuildMode = 'settlement' | 'city' | 'road' | 'robber' | 'erase' | null;

export type BuildingType = 'settlement' | 'city';

/** How the board is drawn: the original flat 'Tavern' look, or the illustrated 'Classic' board. Purely visual. */
export type BoardStyle = 'tavern' | 'classic';

/** 3–4 players use the standard 19-hex island; 5–6 players use the 30-hex extension board. */
export type BoardKind = 'standard' | 'extended';

export interface Point {
  x: number;
  y: number;
}

export interface Hex extends Point {
  id: number;
  row: number;
  col: number;
  resource: ResourceType;
  number: number | null;
  vertexIds: number[];
  edgeIds: number[];
}

export interface Vertex extends Point {
  id: number;
  hexIds: number[];
  edgeIds: number[];
  building: { playerId: number; type: BuildingType } | null;
}

export interface Edge {
  id: number;
  v1: number;
  v2: number;
  hexIds: number[];
  road: { playerId: number } | null;
}

export interface Harbor {
  id: number;
  edgeId: number;
  type: HarborType;
  /** Outward-facing angle (radians) from the board centroid, used to place the label off the coast. */
  angle: number;
}

export interface Board {
  hexes: Hex[];
  vertices: Vertex[];
  edges: Edge[];
  harbors: Harbor[];
  robberHexId: number;
}

export interface Player {
  slot: number;
  /** Auto-assigned by slot order — players don't choose a gem. */
  gem: string;
  name: string;
}

export interface DevCardLegendRow {
  id: string;
  label: string;
  meaning: string;
}

export interface ManualScore {
  hasLargestArmy: boolean;
  devCardVictoryPoints: number;
}

/**
 * 'setup' is the names screen; 'arrange' is on the board, where players pick colours and drag themselves into turn order;
 * 'opening' is the snake-order placement of each player's first two settlements and roads.
 */
export type Phase = 'setup' | 'arrange' | 'opening' | 'playing';

export interface OpeningState {
  /** Slots in placement order: forward through the players, then back (1..N, N..1). */
  order: number[];
  index: number;
  step: 'settlement' | 'road';
  /** The settlement just placed — the opening road must touch it. */
  settlementVertexId: number | null;
}

export interface LongestRoadEvent {
  /** Monotonic across games so the UI can tell a new event from one it already showed. */
  id: number;
  kind: 'gain' | 'steal' | 'lost';
  slot: number | null;
  previousSlot: number | null;
  length: number;
}

export interface Snapshot {
  board: Board;
  phase: Phase;
  opening: OpeningState | null;
  round: number;
  longestRoadHolder: number | null;
}

export interface GameState {
  phase: Phase;
  /** Array order is the turn order. */
  players: Player[];
  currentPlayerSlot: number;
  round: number;
  buildMode: BuildMode;
  board: Board;
  boardKind: BoardKind;
  opening: OpeningState | null;
  /** Which phase the setup screen returns to when it was reopened mid-game. */
  setupReturn: Exclude<Phase, 'setup'> | null;
  devCardLegend: DevCardLegendRow[];
  /** Visual preferences — kept across New Game and saved in localStorage. */
  boardStyle: BoardStyle;
  tableTheme: TableThemeId;
  manualScores: Record<number, ManualScore>;
  longestRoadHolder: number | null;
  lrEvent: LongestRoadEvent | null;
  eventSeq: number;
  /** Bumped whenever the turn passes to someone new (drives the banner + sound). */
  turnCue: number;
  history: Snapshot[];
}
