export interface GameEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  /** Hexagon gradient (light, mid, dark) — each game gets its own accent on the hub. */
  colors: [string, string, string];
}

/** Single source of truth for every game listed on the hub. Add a new game by adding one entry here. */
export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'catan',
    title: 'Catan',
    description: 'Shared board + auto-scoring for a physical Catan game night.',
    path: './catan/',
    colors: ['#ffc27a', '#f2883a', '#c05a12'],
  },
  {
    id: 'scotland-yard',
    title: 'Scotland Yard',
    description: 'Shared London map, tickets and travel log for a physical Scotland Yard game night.',
    path: './scotland-yard/',
    colors: ['#7fd6d0', '#2a9fa0', '#0d5d6a'],
  },
];
