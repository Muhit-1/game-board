import { useEffect, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { GameAction, GameState } from '../state';
import type { PlayerScoreBreakdown } from '../scoring/computeScores';
import { PlayerList } from './PlayersPanel';
import { ReferenceContent } from './ReferencePanel';
import type { ReferenceTab } from './ReferencePanel';
import { TOOLS } from './ToolsPanel';
import { GemIcon } from '../../../shared/components/GemIcon';
import { getGem } from '../../../shared/theme/gems';
import { Menu, Shuffle, RefreshCw, Users, X, Undo2, Volume2, VolumeX, ChevronRight } from '../../../shared/icons';

type SheetKey = 'players' | ReferenceTab | 'menu';

interface MobileControlsProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  scores: Record<number, PlayerScoreBreakdown>;
  muted: boolean;
  onToggleSound: () => void;
  onShuffle: () => void;
  onNewGame: () => void;
  onOpenSetup: () => void;
}

const SHEET_TABS: { key: SheetKey; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'costs', label: 'Costs' },
  { key: 'dev', label: 'Dev' },
  { key: 'ports', label: 'Ports' },
  { key: 'menu', label: 'Menu' },
];

function MenuButton({ icon, label, onClick, disabled = false }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-charred-oak/40 px-4 py-3.5 text-left text-md font-semibold text-parchment hover:bg-walnut-2 disabled:opacity-40"
    >
      <span className="text-brass">{icon}</span>
      {label}
    </button>
  );
}

/** Below ~1100px wide: a turn bar + score chips on top, tools in a bottom dock, everything else in one pull-up sheet. */
export function MobileControls({ state, dispatch, scores, muted, onToggleSound, onShuffle, onNewGame, onOpenSetup }: MobileControlsProps) {
  const [open, setOpen] = useState<SheetKey | null>(null);
  const current = state.players.find((p) => p.slot === state.currentPlayerSlot);
  const currentGem = current ? getGem(current.gem) : undefined;
  const locked = state.phase !== 'playing';
  const opening = state.phase === 'opening' ? state.opening : null;
  const arranging = state.phase === 'arrange';

  // Right after Start the sheet opens on the players so the table can pick colours and turn order straight away.
  useEffect(() => {
    if (arranging) setOpen('players');
  }, [arranging]);

  function closeThen(action: () => void) {
    return () => {
      setOpen(null);
      action();
    };
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 min-[1100px]:hidden">
      <div className="pointer-events-auto absolute inset-x-0 top-0 bg-gradient-to-b from-charred-oak via-charred-oak/90 to-transparent px-2.5 pb-4 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          {arranging && (
            <>
              <div className="min-w-0 rounded-full border border-brass bg-walnut-2 px-3.5 py-1.5 leading-tight">
                <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">Before we start</div>
                <div className="truncate text-body font-bold text-parchment">Organize your players</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  dispatch({ type: 'BEGIN_OPENING' });
                }}
                className="flex shrink-0 items-center gap-1 rounded-full border border-brass bg-brass px-3.5 py-2 text-label font-bold uppercase tracking-caps text-charred-oak"
              >
                Start <ChevronRight size={14} strokeWidth={2.4} />
              </button>
            </>
          )}
          {!arranging && current && currentGem && (
            <div className="flex min-w-0 items-center gap-2 rounded-full border bg-walnut-2 py-1 pl-1.5 pr-3.5" style={{ borderColor: currentGem.glow }}>
              <GemIcon gem={currentGem} size={24} />
              <div className="min-w-0 leading-tight">
                <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">
                  {opening ? (opening.step === 'settlement' ? 'Place settlement' : 'Now a road') : `Round ${state.round}`}
                </div>
                <div className="truncate text-body font-bold text-parchment">{current.name}</div>
              </div>
            </div>
          )}
          {!locked && !arranging && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'NEXT_TURN' })}
              className="flex items-center gap-1 rounded-full border border-brass bg-brass px-3.5 py-2 text-label font-bold uppercase tracking-caps text-charred-oak"
            >
              Next turn <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div className={`mt-2 flex gap-1.5 overflow-x-auto pb-1 ${arranging ? 'hidden' : ''}`}>
          {state.players.map((p) => {
            const gem = getGem(p.gem)!;
            const active = p.slot === state.currentPlayerSlot;
            return (
              <button
                key={p.slot}
                type="button"
                onClick={() => dispatch({ type: 'SET_CURRENT_PLAYER', slot: p.slot })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-small font-bold ${active ? 'bg-walnut-2' : 'border-[var(--line)] bg-walnut'}`}
                style={active ? { borderColor: gem.glow } : undefined}
              >
                <GemIcon gem={gem} size={22} />
                <span className="max-w-[84px] truncate text-parchment">{p.name}</span>
                <span className="font-mono text-brass-soft">{scores[p.slot]?.total ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <>
          <div className="pointer-events-auto absolute inset-0 bg-black/50" onClick={() => setOpen(null)} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-[68px] max-h-[68vh] overflow-y-auto rounded-t-2xl border-t border-brass/60 bg-walnut p-3.5 shadow-deep scrollbar-ironwood">
            <div className="mb-3 flex items-center gap-1">
              {SHEET_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setOpen(t.key)}
                  className={`flex-1 rounded-lg border py-2 text-label font-bold ${open === t.key ? 'border-brass bg-walnut-2 text-parchment' : 'border-[var(--line)] text-parchment-dim'}`}
                >
                  {t.label}
                </button>
              ))}
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-parchment-dim">
                <X size={15} />
              </button>
            </div>

            {open === 'players' && (
              <>
                <PlayerList state={state} dispatch={dispatch} scores={scores} variant="sheet" />
                <p className="text-label text-parchment-dim">
                  {arranging
                    ? 'Drag the handle to set turn order (first plays first) and tap a colour for each player. Then press Start.'
                    : 'Drag the handle to change turn order. Double-tap a name to rename.'}
                </p>
              </>
            )}
            {(open === 'costs' || open === 'dev' || open === 'ports') && <ReferenceContent tab={open} state={state} dispatch={dispatch} />}
            {open === 'menu' && (
              <div className="flex flex-col gap-2.5">
                <MenuButton icon={<Undo2 size={18} />} label="Undo" disabled={state.history.length === 0} onClick={closeThen(() => dispatch({ type: 'UNDO' }))} />
                <MenuButton icon={muted ? <VolumeX size={18} /> : <Volume2 size={18} />} label={muted ? 'Unmute sounds' : 'Mute sounds'} onClick={onToggleSound} />
                <MenuButton icon={<Shuffle size={18} />} label="Shuffle Board" onClick={closeThen(onShuffle)} />
                <MenuButton icon={<Users size={18} />} label="Setup (names, dev cards)" onClick={closeThen(onOpenSetup)} />
                <MenuButton icon={<RefreshCw size={18} />} label="New Game" onClick={closeThen(onNewGame)} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-[68px] items-stretch border-t border-[var(--line)] bg-walnut px-1">
        {TOOLS.map((tool) => {
          const active = state.buildMode === tool.mode;
          return (
            <button
              key={tool.mode}
              type="button"
              disabled={locked}
              onClick={() => dispatch({ type: 'SET_BUILD_MODE', mode: active ? null : tool.mode })}
              className={`my-1 flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border text-micro font-bold uppercase tracking-wide transition-colors ${
                active ? 'border-brass bg-walnut-2 text-parchment' : 'border-transparent text-parchment-dim'
              } ${locked && !active ? 'opacity-40' : ''}`}
            >
              <span className={active ? 'text-brass-soft' : 'text-brass'}>{tool.icon}</span>
              {tool.shortLabel}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((o) => (o ? null : 'players'))}
          className={`my-1 flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border text-micro font-bold uppercase tracking-wide ${
            open ? 'border-brass bg-walnut-2 text-parchment' : 'border-transparent text-parchment-dim'
          }`}
        >
          <span className="text-brass">
            <Menu size={17} strokeWidth={1.8} />
          </span>
          More
        </button>
      </div>
    </div>
  );
}
