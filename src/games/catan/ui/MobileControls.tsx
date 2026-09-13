import { useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { GameAction, GameState } from '../state';
import { CurrentPlayerAndBuildContent } from './TopLeftWidget';
import { ScoreContent } from './ScorePanel';
import { CostsContent } from './CostCheatSheet';
import { DevCardLegendEditor } from './DevCardLegendEditor';
import { User, Trophy, Coins, Layers, Menu, Shuffle, RefreshCw, Users, X } from '../../../shared/icons';

type SheetKey = 'build' | 'score' | 'costs' | 'legend' | 'actions';

interface MobileControlsProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onShuffle: () => void;
  onNewGame: () => void;
  onOpenSetup: () => void;
}

const NAV_ITEMS: { key: SheetKey; label: string; icon: ReactNode }[] = [
  { key: 'build', label: 'Build', icon: <User size={19} strokeWidth={1.8} /> },
  { key: 'score', label: 'Score', icon: <Trophy size={19} strokeWidth={1.8} /> },
  { key: 'costs', label: 'Costs', icon: <Coins size={19} strokeWidth={1.8} /> },
  { key: 'legend', label: 'Legend', icon: <Layers size={19} strokeWidth={1.8} /> },
  { key: 'actions', label: 'More', icon: <Menu size={19} strokeWidth={1.8} /> },
];

const SHEET_TITLES: Record<SheetKey, string> = {
  build: 'Current Player & Build',
  score: 'Score',
  costs: 'Costs',
  legend: 'Dev Card Legend',
  actions: 'Board Actions',
};

function ActionsContent({ onShuffle, onNewGame, onOpenSetup }: { onShuffle: () => void; onNewGame: () => void; onOpenSetup: () => void }) {
  const items = [
    { label: 'Shuffle Board', icon: <Shuffle size={18} strokeWidth={1.8} />, onClick: onShuffle },
    { label: 'New Game', icon: <RefreshCw size={18} strokeWidth={1.8} />, onClick: onNewGame },
    { label: 'Setup', icon: <Users size={18} strokeWidth={1.8} />, onClick: onOpenSetup },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-charred-oak/40 px-4 py-3.5 text-left text-[15px] font-semibold text-parchment hover:bg-walnut-2"
        >
          <span className="text-brass">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Mobile-only replacement for the floating corner panels: a bottom nav that opens one panel at a time as a sheet. */
export function MobileControls({ state, dispatch, onShuffle, onNewGame, onOpenSetup }: MobileControlsProps) {
  const [open, setOpen] = useState<SheetKey | null>(null);

  function toggle(key: SheetKey) {
    setOpen((current) => (current === key ? null : key));
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 md:hidden">
      {open && (
        <>
          <div className="pointer-events-auto absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-16 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-walnut p-4 shadow-deep scrollbar-ironwood">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-brass-soft">{SHEET_TITLES[open]}</span>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-parchment-dim"
              >
                <X size={16} />
              </button>
            </div>

            {open === 'build' && <CurrentPlayerAndBuildContent state={state} dispatch={dispatch} />}
            {open === 'score' && <ScoreContent state={state} dispatch={dispatch} />}
            {open === 'costs' && <CostsContent />}
            {open === 'legend' && (
              <DevCardLegendEditor rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
            )}
            {open === 'actions' && (
              <ActionsContent
                onShuffle={() => {
                  setOpen(null);
                  onShuffle();
                }}
                onNewGame={() => {
                  setOpen(null);
                  onNewGame();
                }}
                onOpenSetup={() => {
                  setOpen(null);
                  onOpenSetup();
                }}
              />
            )}
          </div>
        </>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-16 items-stretch border-t border-[var(--line)] bg-walnut">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              open === key ? 'text-brass-soft' : 'text-parchment-dim'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
