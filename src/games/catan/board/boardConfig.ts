import type { BoardKind, HarborType, ResourceType } from '../types';

export interface BoardConfig {
  rows: number[];
  resources: Record<ResourceType, number>;
  tokens: Record<number, number>;
  harbors: HarborType[];
}

/** Official hex counts, number tokens and harbours for the standard board and the 5–6 player extension. */
export const BOARD_CONFIGS: Record<BoardKind, BoardConfig> = {
  standard: {
    rows: [3, 4, 5, 4, 3],
    resources: { forest: 4, pasture: 4, fields: 4, hills: 3, mountains: 3, desert: 1 },
    tokens: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
    harbors: ['generic', 'generic', 'generic', 'generic', 'wood', 'brick', 'ore', 'grain', 'wool'],
  },
  extended: {
    rows: [3, 4, 5, 6, 5, 4, 3],
    resources: { forest: 6, pasture: 6, fields: 6, hills: 5, mountains: 5, desert: 2 },
    tokens: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
    harbors: ['generic', 'generic', 'generic', 'generic', 'generic', 'wood', 'brick', 'ore', 'grain', 'wool', 'wool'],
  },
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

export function boardKindForPlayers(playerCount: number): BoardKind {
  return playerCount >= 5 ? 'extended' : 'standard';
}

export function describeBoard(kind: BoardKind): string {
  const c = BOARD_CONFIGS[kind];
  const hexes = c.rows.reduce((a, b) => a + b, 0);
  const tokens = Object.values(c.tokens).reduce((a, b) => a + b, 0);
  const generic = c.harbors.filter((h) => h === 'generic').length;
  const resourceText = (Object.entries(c.resources) as [ResourceType, number][]).map(([r, n]) => `${n} ${r}`).join(', ');
  return `${hexes} hexes (${resourceText}), ${tokens} number tokens, ${c.harbors.length} harbours (${generic} × 3:1 and ${c.harbors.length - generic} × 2:1).`;
}
