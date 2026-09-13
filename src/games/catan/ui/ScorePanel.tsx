import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { Panel } from '../../../shared/components/Panel';
import { GemIcon } from '../../../shared/components/GemIcon';
import { getGem } from '../../../shared/theme/gems';
import { computeScores } from '../scoring/computeScores';
import { Trophy, Plus, Minus } from '../../../shared/icons';

export function ScorePanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const scores = computeScores(
    state.board,
    state.players.map((p) => p.slot),
    state.manualScores,
  );

  return (
    <Panel title="Score" icon={<Trophy size={14} />} width={280} collapsible={false} scrollable={false}>
      <div className="flex flex-col gap-2.5">
        {state.players.map((p) => {
          const gem = getGem(p.gem);
          const score = scores[p.slot];
          const manual = state.manualScores[p.slot];
          return (
            <div key={p.slot} className="group relative rounded-lg border border-[var(--line)] bg-charred-oak/40 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {gem && <GemIcon gem={gem} size={20} />}
                  <span className="text-[14px] font-semibold text-parchment">Player {p.slot + 1}</span>
                </div>
                <span className="font-mono text-[18px] font-bold text-brass-soft">{score.total}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_LARGEST_ARMY', slot: manual?.hasLargestArmy ? null : p.slot })}
                  className={[
                    'rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.03em]',
                    manual?.hasLargestArmy ? 'border-brass bg-walnut-2 text-brass-soft' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
                  ].join(' ')}
                >
                  Largest Army
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-parchment-dim">VP</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'ADJUST_DEV_VP', slot: p.slot, delta: -1 })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] text-parchment-dim hover:bg-walnut-2"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'ADJUST_DEV_VP', slot: p.slot, delta: 1 })}
                    className="flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] text-parchment-dim hover:bg-walnut-2"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              <div className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-brass/40 bg-charred-oak px-2 py-1.5 text-center font-mono text-[12px] text-parchment opacity-0 shadow-deep transition-opacity duration-100 group-hover:opacity-100">
                S:{score.settlements} · C:{score.cities / 2} · Road:{score.longestRoad ? 2 : 0} · Army:{score.largestArmy ? 2 : 0} · VP:
                {score.devCardVictoryPoints}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
