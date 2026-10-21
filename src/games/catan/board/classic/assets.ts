import { useEffect, useMemo, useReducer } from 'react';
import type { Board, ResourceType } from '../../types';
import { computeViewBox } from '../viewBox';
import { ensureTile, peekTile } from './tileArt';
import { ensureSea, peekSea } from './seaArt';

/** Alternate two painted variants per terrain so repeated tiles on one board don't look cloned. */
export function tileVariants(hexes: Board['hexes']): number[] {
  const seen: Partial<Record<ResourceType, number>> = {};
  return hexes.map((h) => {
    const n = (seen[h.resource] = (seen[h.resource] ?? 0) + 1);
    return n % 2;
  });
}

export interface ClassicAssets {
  variants: number[];
  /** Bumps whenever another bitmap finishes painting, so memoised layers know to redraw. */
  version: number;
  tileUrl: (kind: ResourceType, variant: number) => string | undefined;
  seaUrl: string | undefined;
}

/**
 * Paints the Classic board's bitmaps in small chunks (one tile or the sea per task) so the page stays responsive;
 * the board draws plain cream tiles and water until each bitmap arrives. Bitmaps are cached across boards.
 */
export function useClassicAssets(board: Board, enabled: boolean): ClassicAssets {
  const [version, refresh] = useReducer((n: number) => n + 1, 0);
  const variants = useMemo(() => tileVariants(board.hexes), [board.hexes]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const jobs: (() => void)[] = [];
    board.hexes.forEach((hex, i) => {
      if (!peekTile(hex.resource, variants[i])) jobs.push(() => ensureTile(hex.resource, variants[i]));
    });
    if (!peekSea(board.hexes)) jobs.push(() => ensureSea(board.hexes, computeViewBox(board)));
    if (jobs.length === 0) return;

    // Tiles shared by several hexes are only painted once (ensureTile is idempotent).
    function next() {
      if (cancelled) return;
      const job = jobs.shift();
      if (!job) return;
      job();
      refresh();
      window.setTimeout(next, 0);
    }
    const timer = window.setTimeout(next, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [board.hexes, enabled, variants]);

  return {
    variants,
    version,
    tileUrl: peekTile,
    seaUrl: enabled ? peekSea(board.hexes) : undefined,
  };
}
