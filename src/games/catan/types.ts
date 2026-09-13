export type ResourceType = 'forest' | 'pasture' | 'fields' | 'hills' | 'mountains' | 'desert';

export type HarborType = 'generic' | 'wood' | 'brick' | 'ore' | 'grain' | 'wool';

export type BuildMode = 'settlement' | 'city' | 'road' | 'robber' | 'erase' | null;

export type BuildingType = 'settlement' | 'city';

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

export type Phase = 'setup' | 'playing';

export interface GameState {
  phase: Phase;
  players: Player[];
  currentPlayerSlot: number;
  buildMode: BuildMode;
  board: Board;
  devCardLegend: DevCardLegendRow[];
  manualScores: Record<number, ManualScore>;
}
