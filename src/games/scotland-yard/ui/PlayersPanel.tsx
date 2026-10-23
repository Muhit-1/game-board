import { Fragment, useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { MAX_NAME_LENGTH } from '../state';
import { detectivesOf, mrXOf } from '../rules';
import { REVEAL_ROUNDS, TOTAL_ROUNDS } from '../data/graph';
import type { Player } from '../types';
import { GemIcon } from '../../../shared/components/GemIcon';
import { GemPicker } from '../../../shared/components/GemPicker';
import { usePointerReorder } from '../../../shared/hooks/usePointerReorder';
import { getGem } from '../../../shared/theme/gems';
import { ChevronRight, EyeOff, GripVertical, Shuffle } from '../../../shared/icons';
import { TicketChip } from './TicketChip';

/** Which round the table is in: Mr. X's next cell while he is to move, otherwise the round whose detectives are moving. */
export function currentRound(state: GameState): number {
  return state.turn.side === 'mrx' ? state.log.length + 1 : state.log.length;
}

function nextRevealRound(round: number): number | null {
  return REVEAL_ROUNDS.find((r) => r >= round) ?? null;
}

interface TurnCardProps {
  state: GameState;
  onOpenSecret: () => void;
}

/** "Now playing": who is to move and what to do about it. */
export function TurnCard({ state, onOpenSecret }: TurnCardProps) {
  const mrX = mrXOf(state.players);
  const current = state.turn.side === 'mrx' ? mrX : state.players.find((p) => p.slot === (state.turn as { slot: number }).slot);
  const gem = current ? getGem(current.gem) : undefined;
  if (!current || !gem) return null;
  const round = currentRound(state);
  const reveal = nextRevealRound(round);

  return (
    <div className="rounded-2xl border bg-walnut p-3 shadow-deep" style={{ borderColor: gem.glow }}>
      <div className="flex items-center justify-between text-micro font-bold uppercase tracking-kicker text-brass-soft">
        <span>
          Round {Math.min(round, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}
        </span>
        <span className="text-parchment-dim">{reveal ? `Reveal: round ${reveal}` : 'No more reveals'}</span>
      </div>
      <div className="mb-2.5 mt-2 flex items-center gap-2.5">
        <GemIcon gem={gem} size={38} />
        <div className="min-w-0">
          <div className="text-micro font-bold uppercase tracking-caps text-parchment-dim">{state.turn.side === 'mrx' ? 'Mr. X to move' : 'Detective to move'}</div>
          <div className="truncate font-display text-[24px] font-semibold leading-tight text-parchment">{current.name}</div>
        </div>
      </div>
      {state.turn.side === 'mrx' ? (
        <button
          type="button"
          onClick={onOpenSecret}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-brass bg-brass px-3 py-2.5 text-label font-bold uppercase tracking-caps text-charred-oak transition-colors hover:bg-brass-soft"
        >
          <EyeOff size={15} /> Secret move <kbd className="font-mono text-micro opacity-70">X</kbd>
        </button>
      ) : (
        <div className="text-small font-semibold leading-snug text-parchment">Tap one of the glowing stations on the map.</div>
      )}
    </div>
  );
}

/** Shown right after Start: colours, detective order and starting stations, then play. */
export function ArrangeCard({ dispatch }: { dispatch: Dispatch<GameAction> }) {
  return (
    <div className="rounded-2xl border border-brass bg-walnut p-3.5 shadow-deep">
      <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">Before we start</div>
      <div className="mt-1 font-display text-[22px] font-semibold leading-tight text-parchment">Organize your players</div>
      <p className="mb-3 mt-2 text-label leading-snug text-parchment-dim">
        Drag the detectives into turn order, tap a colour for each player, and shuffle the start stations if you like. Mr. X's start stays hidden.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'RESHUFFLE_STARTS' })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-label font-bold uppercase tracking-caps text-parchment hover:bg-walnut-2"
        >
          <Shuffle size={14} className="text-brass" /> Shuffle start stations
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'BEGIN_GAME' })}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-brass bg-brass px-3 py-2.5 text-label font-bold uppercase tracking-caps text-charred-oak transition-colors hover:bg-brass-soft"
        >
          Start the chase <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

interface PlayerListProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function NameLabel({ player, editing, onStart, onStop, dispatch }: { player: Player; editing: boolean; onStart: () => void; onStop: () => void; dispatch: Dispatch<GameAction> }) {
  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={player.name}
        maxLength={MAX_NAME_LENGTH}
        aria-label="Player name"
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          onStop();
          dispatch({ type: 'RENAME_PLAYER', slot: player.slot, name: e.currentTarget.value });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') onStop();
        }}
        className="w-full rounded border border-brass bg-charred-oak px-1.5 py-0.5 text-body font-bold text-parchment outline-none"
      />
    );
  }
  return (
    <div className="truncate text-body font-bold text-parchment" title="Double-click to rename" onDoubleClick={onStart}>
      {player.name}
    </div>
  );
}

/** Mr. X (hidden position) on top, then the detectives — drag them to change the turn order at any time. */
export function PlayerList({ state, dispatch }: PlayerListProps) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const mrX = mrXOf(state.players);
  const detectives = detectivesOf(state.players);
  const arranging = state.phase === 'arrange';
  const gemHolders = Object.fromEntries(state.players.map((p) => [p.gem, p.name]));

  const { drag, register, handleProps } = usePointerReorder(
    detectives.map((d) => d.slot),
    (slot, toIndex) => {
      const target = detectives[Math.max(0, Math.min(detectives.length - 1, toIndex))];
      dispatch({ type: 'REORDER_PLAYERS', slot, toIndex: state.players.findIndex((p) => p.slot === target.slot) });
    },
  );

  const nextSlot = (() => {
    if (state.phase !== 'playing' || state.turn.side !== 'detective') return null;
    const index = detectives.findIndex((d) => d.slot === (state.turn as { slot: number }).slot);
    return detectives[index + 1]?.slot ?? null;
  })();

  const dropBar = (
    <div className="relative h-0">
      <div className="absolute inset-x-1 -top-[7px] h-[3px] rounded bg-brass shadow-[0_0_8px_var(--brass)]" />
    </div>
  );

  let othersSeen = 0;
  return (
    <div className="flex flex-col">
      {/* Mr. X */}
      <div
        className={['mb-2 rounded-xl border bg-walnut px-2.5 py-2 shadow-card', state.turn.side === 'mrx' && state.phase === 'playing' ? 'border-parchment/60' : 'border-[var(--line)]'].join(' ')}
      >
        <div className="flex items-center gap-2">
          <GemIcon gem={getGem(mrX.gem)!} size={26} />
          <div className="min-w-0 flex-1">
            <NameLabel player={mrX} editing={editingSlot === mrX.slot} onStart={() => setEditingSlot(mrX.slot)} onStop={() => setEditingSlot(null)} dispatch={dispatch} />
          </div>
          <span className="rounded-md border border-[#666] bg-black px-1.5 py-0.5 text-micro font-bold uppercase tracking-caps text-white">Mr. X</span>
          <span className="w-7 text-right font-mono text-[20px] font-bold text-parchment-dim" title="Mr. X's station is secret">
            ?
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TicketChip kind="black" count={state.tickets[mrX.slot]?.black ?? 0} />
          <TicketChip kind="double" count={state.tickets[mrX.slot]?.double ?? 0} />
          <span className="text-label font-semibold text-parchment-dim">{state.lastSeen ? `last seen ${state.lastSeen.station} · R${state.lastSeen.round}` : 'not seen yet'}</span>
        </div>
        {arranging && (
          <div className="mt-2">
            <GemPicker value={mrX.gem} holders={gemHolders} onPick={(gem) => dispatch({ type: 'SET_PLAYER_GEM', slot: mrX.slot, gem })} />
          </div>
        )}
      </div>

      {detectives.map((p) => {
        const gem = getGem(p.gem)!;
        const dragged = drag?.id === p.slot;
        const showBar = drag !== null && !dragged && othersSeen === drag.target;
        if (!dragged) othersSeen++;
        const active = state.phase === 'playing' && state.turn.side === 'detective' && state.turn.slot === p.slot;
        const tickets = state.tickets[p.slot];
        const handle = handleProps(p.slot);
        return (
          <Fragment key={p.slot}>
            {showBar && dropBar}
            <div
              ref={register(p.slot)}
              className={['relative mb-2 rounded-xl border bg-walnut px-2 py-2 shadow-card', active ? 'bg-walnut-2' : 'border-[var(--line)]', dragged ? 'z-20 opacity-90 shadow-deep' : ''].join(' ')}
              style={{
                transform: dragged ? `translateY(${drag.dy}px)` : undefined,
                borderColor: active ? gem.glow : undefined,
                boxShadow: active && !dragged ? `0 0 0 1px ${gem.glow}, var(--shadow-card)` : undefined,
              }}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Drag to change turn order"
                  aria-label={`Drag to reorder ${p.name}. Arrow keys also move it.`}
                  {...handle}
                  className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-parchment-dim/50 hover:text-brass-soft active:cursor-grabbing"
                >
                  <GripVertical size={15} />
                </button>
                <GemIcon gem={gem} size={26} />
                <div className="min-w-0 flex-1">
                  <NameLabel player={p} editing={editingSlot === p.slot} onStart={() => setEditingSlot(p.slot)} onStop={() => setEditingSlot(null)} dispatch={dispatch} />
                  {p.slot === nextSlot && <div className="text-micro font-bold uppercase tracking-kicker text-parchment-dim">Up next</div>}
                </div>
                <span className="font-mono text-[20px] font-bold text-brass-soft">{state.positions[p.slot]}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 pl-6">
                <TicketChip kind="taxi" count={tickets?.taxi ?? 0} />
                <TicketChip kind="bus" count={tickets?.bus ?? 0} />
                <TicketChip kind="ug" count={tickets?.ug ?? 0} />
              </div>
              {arranging && (
                <div className="mt-2 pl-6">
                  <GemPicker value={p.gem} holders={gemHolders} onPick={(gemId) => dispatch({ type: 'SET_PLAYER_GEM', slot: p.slot, gem: gemId })} />
                </div>
              )}
            </div>
          </Fragment>
        );
      })}
      {drag !== null && drag.target === detectives.length - 1 && othersSeen === detectives.length - 1 && dropBar}
    </div>
  );
}
