import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import type { BuildMode } from '../types';
import { Panel } from '../../../shared/components/Panel';
import { GemIcon } from '../../../shared/components/GemIcon';
import { getGem } from '../../../shared/theme/gems';
import { Home, Building2, Route, Skull, Eraser, User } from '../../../shared/icons';

const BUILD_MODES: { mode: BuildMode; label: string; icon: JSX.Element }[] = [
  { mode: 'settlement', label: 'Settlement', icon: <Home size={16} strokeWidth={1.8} /> },
  { mode: 'city', label: 'City', icon: <Building2 size={16} strokeWidth={1.8} /> },
  { mode: 'road', label: 'Road', icon: <Route size={16} strokeWidth={1.8} /> },
  { mode: 'robber', label: 'Robber', icon: <Skull size={16} strokeWidth={1.8} /> },
  { mode: 'erase', label: 'Erase', icon: <Eraser size={16} strokeWidth={1.8} /> },
];

/** The shared inner content, reused by the desktop corner panel and the mobile bottom sheet. */
export function CurrentPlayerAndBuildContent({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-parchment-dim">Current player</div>
        <div className="flex flex-wrap gap-2">
          {state.players.map((p) => {
            const gem = getGem(p.gem);
            const active = state.currentPlayerSlot === p.slot;
            return (
              <button
                key={p.slot}
                type="button"
                onClick={() => dispatch({ type: 'SET_CURRENT_PLAYER', slot: p.slot })}
                className={[
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                  active ? 'border-brass bg-walnut-2 ring-1 ring-brass/50' : 'border-[var(--line)] hover:bg-walnut-2',
                ].join(' ')}
              >
                {gem && <GemIcon gem={gem} size={20} />}
                <span className="text-[13px] font-semibold text-parchment">P{p.slot + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-parchment-dim">Build mode</div>
        <div className="grid grid-cols-2 gap-2">
          {BUILD_MODES.map(({ mode, label, icon }) => {
            const active = state.buildMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => dispatch({ type: 'SET_BUILD_MODE', mode: active ? null : mode })}
                className={[
                  'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold transition-colors',
                  active ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/50' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
                ].join(' ')}
              >
                <span className={active ? 'text-brass-soft' : 'text-brass'}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TopLeftWidget({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  return (
    <Panel title="Current Player & Build" icon={<User size={14} />} width={288}>
      <CurrentPlayerAndBuildContent state={state} dispatch={dispatch} />
    </Panel>
  );
}
