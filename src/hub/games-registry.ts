export interface GameEntry {
  id: string;
  title: string;
  description: string;
  path: string;
}

/** Single source of truth for every game listed on the hub. Add a new game by adding one entry here. */
export const GAMES_REGISTRY: GameEntry[] = [
  {
    id: 'catan',
    title: 'Catan',
    description: 'Shared board + auto-scoring for a physical Catan game night.',
    path: './catan/',
  },
];
