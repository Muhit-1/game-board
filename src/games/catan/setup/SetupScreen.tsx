import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { DevCardLegendEditor } from '../ui/DevCardLegendEditor';
import { gemForSlot } from '../../../shared/theme/gems';
import { GemIcon } from '../../../shared/components/GemIcon';
import { Users } from '../../../shared/icons';

interface SetupScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const PLAYER_COUNTS = [3, 4, 5, 6];

export function SetupScreen({ state, dispatch }: SetupScreenProps) {
  const isResume = state.players.length > 0;
  const [playerCount, setPlayerCount] = useState(state.players.length || 4);

  function handleStart() {
    const players = Array.from({ length: playerCount }, (_, slot) => ({ slot, gem: gemForSlot(slot).id }));
    dispatch({ type: isResume ? 'RESUME_SETUP' : 'START_GAME', players });
  }

  function handleCancel() {
    dispatch({ type: 'RESUME_SETUP', players: state.players });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-walnut p-9 shadow-deep">
        <div className="mb-9 flex items-center gap-3.5">
          <Users size={26} className="text-brass" strokeWidth={1.8} />
          <div>
            <h1 className="font-display text-3xl font-semibold text-parchment">Catan — Setup</h1>
            <p className="mt-1 text-[15px] text-parchment-dim">Choose how many people are playing, then start.</p>
          </div>
        </div>

        <section className="mb-9">
          <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-brass-soft">Player count</div>
          <div className="flex gap-3">
            {PLAYER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setPlayerCount(count)}
                className={[
                  'flex h-14 w-14 items-center justify-center rounded-xl border font-display text-2xl font-semibold transition-colors',
                  playerCount === count
                    ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/60'
                    : 'border-[var(--line)] bg-charred-oak text-parchment-dim hover:bg-walnut-2',
                ].join(' ')}
              >
                {count}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {Array.from({ length: playerCount }, (_, slot) => {
              const gem = gemForSlot(slot);
              return (
                <div
                  key={slot}
                  className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-charred-oak/50 py-1.5 pl-2 pr-3"
                >
                  <GemIcon gem={gem} size={22} />
                  <span className="text-[13px] font-semibold text-parchment">Player {slot + 1}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-9">
          <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-brass-soft">Development card legend</div>
          <DevCardLegendEditor rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
        </section>

        <div className="flex justify-end gap-3">
          {isResume && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[var(--line)] px-5 py-2.5 text-[14px] font-semibold text-parchment-dim hover:bg-walnut-2"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleStart}
            className="rounded-lg border border-brass bg-brass px-7 py-2.5 text-[14px] font-bold uppercase tracking-[0.05em] text-charred-oak"
          >
            {isResume ? 'Save & Resume' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
