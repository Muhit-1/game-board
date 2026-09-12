import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { GemPicker } from './GemPicker';
import { DevCardLegendEditor } from '../ui/DevCardLegendEditor';
import { Users } from '../../../shared/icons';

interface SetupScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const PLAYER_COUNTS = [3, 4, 5, 6];

export function SetupScreen({ state, dispatch }: SetupScreenProps) {
  const isResume = state.players.length > 0;
  const [playerCount, setPlayerCount] = useState(state.players.length || 4);
  const [gems, setGems] = useState<(string | null)[]>(() => {
    const initial: (string | null)[] = Array.from({ length: state.players.length || 4 }, () => null);
    state.players.forEach((p) => {
      if (p.slot < initial.length) initial[p.slot] = p.gem;
    });
    return initial;
  });

  function changePlayerCount(count: number) {
    setPlayerCount(count);
    setGems((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(null);
      return next.slice(0, count);
    });
  }

  function selectGem(slot: number, gemId: string | null) {
    setGems((prev) => prev.map((g, i) => (i === slot ? gemId : g)));
  }

  const canStart = gems.length === playerCount && gems.every((g) => g !== null);

  function handleStart() {
    const players = gems.map((gem, slot) => ({ slot, gem }));
    dispatch({ type: isResume ? 'RESUME_SETUP' : 'START_GAME', players });
  }

  function handleCancel() {
    dispatch({ type: 'RESUME_SETUP', players: state.players });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--line)] bg-walnut p-8 shadow-deep">
        <div className="mb-8 flex items-center gap-3">
          <Users size={22} className="text-brass" strokeWidth={1.8} />
          <div>
            <h1 className="font-display text-2xl font-semibold text-parchment">Catan — Setup</h1>
            <p className="text-[13px] text-parchment-dim">Choose player count, then assign each player a unique gemstone.</p>
          </div>
        </div>

        <section className="mb-7">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-brass-soft">Player count</div>
          <div className="flex gap-2">
            {PLAYER_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => changePlayerCount(count)}
                className={[
                  'flex h-11 w-11 items-center justify-center rounded-lg border font-display text-lg font-semibold transition-colors',
                  playerCount === count
                    ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/60'
                    : 'border-[var(--line)] bg-charred-oak text-parchment-dim hover:bg-walnut-2',
                ].join(' ')}
              >
                {count}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-7 flex flex-col gap-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-brass-soft">Player gems</div>
          {gems.map((gem, slot) => {
            const takenByOthers = new Set(gems.filter((_, i) => i !== slot).filter((g): g is string => g !== null));
            return (
              <div key={slot} className="flex flex-col gap-2">
                <div className="text-[12px] font-semibold text-parchment">Player {slot + 1}</div>
                <GemPicker selected={gem} takenByOthers={takenByOthers} onSelect={(g) => selectGem(slot, g)} />
              </div>
            );
          })}
        </section>

        <details className="mb-7 rounded-lg border border-[var(--line)] bg-charred-oak/40 p-4">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-brass-soft">
            Development card legend
          </summary>
          <div className="mt-3">
            <DevCardLegendEditor rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
          </div>
        </details>

        <div className="flex justify-end gap-3">
          {isResume && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[var(--line)] px-5 py-2.5 text-[12.5px] font-semibold text-parchment-dim hover:bg-walnut-2"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!canStart}
            onClick={handleStart}
            className="rounded-lg border border-brass bg-brass px-6 py-2.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-charred-oak transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isResume ? 'Save & Resume' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
}
