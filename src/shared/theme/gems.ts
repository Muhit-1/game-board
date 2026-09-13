export type GemCut = 'brilliant' | 'cabochon' | 'emerald';

export interface GemDef {
  id: string;
  label: string;
  cut: GemCut;
  c1: string;
  c2: string;
  c3: string;
}

/** The six player identities. Each is a distinct material (gradient + cut), never a flat color swap. */
export const GEMS: GemDef[] = [
  { id: 'ruby', label: 'Ruby', cut: 'brilliant', c1: '#ffd7d9', c2: '#e0243f', c3: '#5c0c17' },
  { id: 'sapphire', label: 'Sapphire', cut: 'brilliant', c1: '#cfe3ff', c2: '#2f5fbf', c3: '#122a5c' },
  { id: 'amethyst', label: 'Amethyst', cut: 'brilliant', c1: '#ecdcff', c2: '#8a4fd6', c3: '#3a1a5c' },
  { id: 'onyx', label: 'Onyx', cut: 'cabochon', c1: '#8a8f99', c2: '#3a3d44', c3: '#0c0d10' },
  { id: 'aquamarine', label: 'Aquamarine', cut: 'emerald', c1: '#d6fff4', c2: '#33b8a3', c3: '#0e4c44' },
  { id: 'rosequartz', label: 'Rose Quartz', cut: 'cabochon', c1: '#ffe3ee', c2: '#e893b3', c3: '#7a3450' },
];

export function getGem(id: string | null): GemDef | undefined {
  return GEMS.find((g) => g.id === id);
}

/** Players don't choose a gem — each slot gets the next one in a fixed order, same every game. */
export function gemForSlot(slot: number): GemDef {
  return GEMS[slot % GEMS.length];
}
