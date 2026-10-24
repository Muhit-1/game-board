import { Fragment, useEffect, useRef, useState } from 'react';
import type { Dispatch, KeyboardEvent, PointerEvent } from 'react';
import type { GameAction, GameState } from '../state';
import { MAX_NAME_LENGTH } from '../state';
import type { ManualScore, Player } from '../types';
import type { PlayerScoreBreakdown } from '../scoring/computeScores';
import { GemIcon } from '../../../shared/components/GemIcon';
import { GemPicker } from '../../../shared/components/GemPicker';
import { getGem } from '../../../shared/theme/gems';
import { ChevronRight, GripVertical, Pencil, Route, Swords, Minus, Plus } from '../../../shared/icons';

type Scores = Record<number, PlayerScoreBreakdown>;

interface PlayersProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  scores: Scores;
}

const POPOVER_WIDTH = 268;
const POPOVER_CLOSE_DELAY_MS = 90;

function LogLine({ label, value, dim = false }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-b border-dashed border-[var(--line)] py-1 text-small ${dim ? 'text-parchment-dim/55' : 'text-parchment-dim'}`}>
      <span>{label}</span>
      <span className={`font-mono font-bold ${dim ? 'text-parchment-dim/55' : 'text-parchment'}`}>{value}</span>
    </div>
  );
}

/** The stacked points receipt plus the two manual controls (Largest Army, dev-card VP). */
function PointsLog({
  score,
  manual,
  slot,
  dispatch,
}: {
  score: PlayerScoreBreakdown;
  manual: ManualScore | undefined;
  slot: number;
  dispatch: Dispatch<GameAction>;
}) {
  const stepper = 'flex h-6 w-6 items-center justify-center rounded border border-[var(--line)] text-parchment-dim hover:bg-walnut-2';
  return (
    <div>
      <LogLine label={`Settlements × ${score.settlements}`} value={score.settlements ? `+${score.settlements}` : '—'} dim={!score.settlements} />
      <LogLine label={`Cities × ${score.cities}`} value={score.cities ? `+${score.cities * 2}` : '—'} dim={!score.cities} />
      <LogLine label="Longest Road" value={score.longestRoad ? '+2' : '—'} dim={!score.longestRoad} />
      <LogLine label="Largest Army" value={score.largestArmy ? '+2' : '—'} dim={!score.largestArmy} />
      <LogLine label="Dev-card VP" value={score.devCardVictoryPoints ? `+${score.devCardVictoryPoints}` : '—'} dim={!score.devCardVictoryPoints} />
      <div className="flex justify-between pt-2 text-small font-bold text-parchment">
        <span>Total</span>
        <span className="font-mono text-md text-brass-soft">{score.total}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_LARGEST_ARMY', slot: manual?.hasLargestArmy ? null : slot })}
          className={[
            'flex items-center gap-1 rounded-md border px-2 py-1 text-micro font-bold uppercase tracking-caps',
            manual?.hasLargestArmy ? 'border-brass bg-brass/10 text-brass-soft' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
          ].join(' ')}
        >
          <Swords size={11} /> Largest army
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-micro font-bold uppercase tracking-caps text-parchment-dim">VP</span>
          <button type="button" aria-label="Remove a dev-card victory point" onClick={() => dispatch({ type: 'ADJUST_DEV_VP', slot, delta: -1 })} className={stepper}>
            <Minus size={12} />
          </button>
          <span className="w-4 text-center font-mono text-small font-bold text-parchment">{score.devCardVictoryPoints}</span>
          <button type="button" aria-label="Add a dev-card victory point" onClick={() => dispatch({ type: 'ADJUST_DEV_VP', slot, delta: 1 })} className={stepper}>
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  score: PlayerScoreBreakdown;
  manual: ManualScore | undefined;
  active: boolean;
  isNext: boolean;
  hasLongestRoad: boolean;
  dragging: boolean;
  dragOffset: number;
  variant: 'floating' | 'sheet';
  arranging: boolean;
  editing: boolean;
  gemHolders: Record<string, string>;
  dispatch: Dispatch<GameAction>;
  onHoverStart: (el: HTMLDivElement) => void;
  onHoverEnd: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onHandlePointerDown: (e: PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerMove: (e: PointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (e: PointerEvent<HTMLButtonElement>) => void;
  onHandleKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

function PlayerCard(props: PlayerCardProps) {
  const { player, score, manual, active, isNext, hasLongestRoad, dragging, dragOffset, variant, arranging, editing, dispatch } = props;
  const gem = getGem(player.gem)!;
  const elRef = useRef<HTMLDivElement | null>(null);

  function commitName(value: string) {
    props.onStopEdit();
    dispatch({ type: 'RENAME_PLAYER', slot: player.slot, name: value });
  }

  const showInlineLog = variant === 'sheet' && active && !arranging;

  return (
    <div
      ref={(el) => {
        elRef.current = el;
        props.cardRef(el);
      }}
      onMouseEnter={() => elRef.current && !dragging && !editing && !arranging && variant === 'floating' && props.onHoverStart(elRef.current)}
      onMouseLeave={props.onHoverEnd}
      onClick={() => {
        dispatch({ type: 'SET_CURRENT_PLAYER', slot: player.slot });
        if (elRef.current && !arranging && variant === 'floating') props.onHoverStart(elRef.current);
      }}
      className={[
        'relative mb-2 rounded-xl border bg-walnut px-2 py-2 shadow-card',
        arranging ? '' : 'cursor-pointer',
        active && !arranging ? 'bg-walnut-2' : 'border-[var(--line)]',
        dragging ? 'z-20 opacity-90 shadow-deep' : '',
      ].join(' ')}
      style={{
        transform: dragging ? `translateY(${dragOffset}px)` : undefined,
        borderColor: active && !arranging ? gem.glow : undefined,
        boxShadow: active && !dragging && !arranging ? `0 0 0 1px ${gem.glow}, var(--shadow-card)` : undefined,
      }}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Drag to change turn order"
          aria-label={`Drag to reorder ${player.name}. Arrow keys also move it.`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={props.onHandlePointerDown}
          onPointerMove={props.onHandlePointerMove}
          onPointerUp={props.onHandlePointerUp}
          onPointerCancel={props.onHandlePointerUp}
          onKeyDown={props.onHandleKeyDown}
          className="flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-parchment-dim/50 hover:text-brass-soft active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
        <GemIcon gem={gem} size={26} />
        <div className="min-w-0 flex-1" onDoubleClick={() => props.onStartEdit()}>
          {editing ? (
            <input
              autoFocus
              defaultValue={player.name}
              maxLength={MAX_NAME_LENGTH}
              aria-label="Player name"
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => commitName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') props.onStopEdit();
              }}
              className="w-full rounded border border-brass bg-charred-oak px-1.5 py-0.5 text-body font-bold text-parchment outline-none"
            />
          ) : (
            <div className="truncate text-body font-bold text-parchment" title="Double-click to rename">
              {player.name}
            </div>
          )}
          {isNext && !editing && <div className="text-micro font-bold uppercase tracking-kicker text-parchment-dim">Up next</div>}
        </div>
        {!arranging && hasLongestRoad && (
          <span title="Longest Road" className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-brass bg-brass/10 text-brass-soft">
            <Route size={12} />
          </span>
        )}
        {!arranging && manual?.hasLargestArmy && (
          <span title="Largest Army" className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-brass bg-brass/10 text-brass-soft">
            <Swords size={12} />
          </span>
        )}
        {!arranging && <span className="w-6 text-right font-mono text-[20px] font-bold text-brass-soft">{score.total}</span>}
      </div>

      {arranging && (
        <div className="mt-1.5 pl-6">
          <GemPicker value={player.gem} holders={props.gemHolders} onPick={(gemId) => dispatch({ type: 'SET_PLAYER_GEM', slot: player.slot, gem: gemId })} />
        </div>
      )}

      {showInlineLog && (
        <div className="mt-2 rounded-lg border border-brass/40 bg-charred-oak px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <PointsLog score={score} manual={manual} slot={player.slot} dispatch={dispatch} />
        </div>
      )}
    </div>
  );
}

interface DragState {
  slot: number;
  startY: number;
  startCenter: number;
  dy: number;
  target: number;
}

interface PopoverState {
  slot: number;
  left: number;
  top: number;
}

/** The scoreboard doubles as the turn order: top to bottom is the order turns pass, and cards can be dragged to change it. */
export function PlayerList({ state, dispatch, scores, variant }: PlayersProps & { variant: 'floating' | 'sheet' }) {
  const refs = useRef(new Map<number, HTMLDivElement | null>());
  const closeTimer = useRef<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const { players } = state;
  const arranging = state.phase === 'arrange';
  const currentIndex = players.findIndex((p) => p.slot === state.currentPlayerSlot);
  const nextSlot = state.phase === 'playing' && players.length > 1 ? players[(currentIndex + 1) % players.length].slot : null;
  const gemHolders = Object.fromEntries(players.map((p) => [p.gem, p.name]));

  // One shared popover for the whole list, so moving between cards replaces it instead of stacking several.
  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPopover(null), POPOVER_CLOSE_DELAY_MS);
  }

  function openPopover(slot: number, el: HTMLDivElement) {
    cancelClose();
    const rect = el.getBoundingClientRect();
    setPopover({ slot, left: rect.right + 10, top: Math.max(8, Math.min(rect.top, window.innerHeight - 380)) });
  }

  // On touch there is no mouseleave, so a tap anywhere else closes the popover.
  useEffect(() => {
    if (!popover) return;
    function onPointerDown(e: globalThis.PointerEvent) {
      const target = e.target as Node;
      const insideCard = [...refs.current.values()].some((el) => el?.contains(target));
      const insidePopover = document.getElementById('points-popover')?.contains(target);
      if (!insideCard && !insidePopover) setPopover(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [popover]);

  useEffect(() => {
    if (arranging || drag) setPopover(null);
  }, [arranging, drag]);

  function centerOf(slot: number): number {
    const rect = refs.current.get(slot)?.getBoundingClientRect();
    return rect ? rect.top + rect.height / 2 : 0;
  }

  function targetFor(slot: number, centerY: number): number {
    return players.filter((p) => p.slot !== slot && centerOf(p.slot) < centerY).length;
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, slot: number) {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is only a nicety (keeps move events flowing outside the handle); dragging still works without it.
    }
    setDrag({ slot, startY: e.clientY, startCenter: centerOf(slot), dy: 0, target: players.findIndex((p) => p.slot === slot) });
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    setDrag({ ...drag, dy, target: targetFor(drag.slot, drag.startCenter + dy) });
  }

  function onPointerUp() {
    if (drag && drag.target !== players.findIndex((p) => p.slot === drag.slot)) {
      dispatch({ type: 'REORDER_PLAYERS', slot: drag.slot, toIndex: drag.target });
    }
    setDrag(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, slot: number, index: number) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      dispatch({ type: 'REORDER_PLAYERS', slot, toIndex: index + (e.key === 'ArrowUp' ? -1 : 1) });
    }
  }

  let othersSeen = 0;
  const dropBar = (
    <div className="relative h-0">
      <div className="absolute inset-x-1 -top-[7px] h-[3px] rounded bg-brass shadow-[0_0_8px_var(--brass)]" />
    </div>
  );

  const popoverPlayer = popover ? players.find((p) => p.slot === popover.slot) : undefined;

  return (
    <div className="flex flex-col">
      {players.map((p, index) => {
        const isDragged = drag?.slot === p.slot;
        const showBar = drag !== null && !isDragged && othersSeen === drag.target;
        if (!isDragged) othersSeen++;
        return (
          <Fragment key={p.slot}>
            {showBar && dropBar}
            <PlayerCard
              player={p}
              score={scores[p.slot]}
              manual={state.manualScores[p.slot]}
              active={p.slot === state.currentPlayerSlot}
              isNext={p.slot === nextSlot}
              hasLongestRoad={state.longestRoadHolder === p.slot}
              dragging={isDragged}
              dragOffset={isDragged ? drag.dy : 0}
              variant={variant}
              arranging={arranging}
              editing={editingSlot === p.slot}
              gemHolders={gemHolders}
              dispatch={dispatch}
              onHoverStart={(el) => openPopover(p.slot, el)}
              onHoverEnd={scheduleClose}
              onStartEdit={() => {
                setPopover(null);
                setEditingSlot(p.slot);
              }}
              onStopEdit={() => setEditingSlot(null)}
              onHandlePointerDown={(e) => onPointerDown(e, p.slot)}
              onHandlePointerMove={onPointerMove}
              onHandlePointerUp={onPointerUp}
              onHandleKeyDown={(e) => onKeyDown(e, p.slot, index)}
              cardRef={(el) => {
                refs.current.set(p.slot, el);
              }}
            />
          </Fragment>
        );
      })}
      {drag !== null && drag.target === players.length - 1 && othersSeen === players.length - 1 && dropBar}

      {popover && popoverPlayer && variant === 'floating' && !arranging && (
        <div
          id="points-popover"
          className="fixed z-50 rounded-xl border border-brass/50 bg-charred-oak px-3 py-2.5 shadow-deep"
          style={{ left: popover.left, top: popover.top, width: POPOVER_WIDTH }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-label font-bold uppercase tracking-caps text-brass-soft">{popoverPlayer.name} · points</span>
            <button
              type="button"
              title="Rename"
              aria-label={`Rename ${popoverPlayer.name}`}
              onClick={() => {
                setPopover(null);
                setEditingSlot(popoverPlayer.slot);
              }}
              className="text-parchment-dim hover:text-brass-soft"
            >
              <Pencil size={13} />
            </button>
          </div>
          <PointsLog score={scores[popoverPlayer.slot]} manual={state.manualScores[popoverPlayer.slot]} slot={popoverPlayer.slot} dispatch={dispatch} />
        </div>
      )}
    </div>
  );
}

/** Shown on the board right after Start: players pick colours and drag themselves into turn order, then begin placing pieces. */
export function ArrangeCard({ dispatch }: { dispatch: Dispatch<GameAction> }) {
  return (
    <div className="rounded-2xl border border-brass bg-walnut p-3.5 shadow-deep">
      <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">Before we start</div>
      <div className="mt-1 font-display text-[22px] font-semibold leading-tight text-parchment">Organize your players</div>
      <p className="mb-3 mt-2 text-label leading-snug text-parchment-dim">
        Drag players into turn order (first in the list plays first) and tap a colour for each. Tapping a colour someone else has swaps the two.
      </p>
      <button
        type="button"
        onClick={() => dispatch({ type: 'BEGIN_OPENING' })}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-brass bg-brass px-3 py-2.5 text-label font-bold uppercase tracking-caps text-charred-oak transition-colors hover:bg-brass-soft"
      >
        Start placing pieces <ChevronRight size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

/** "Now playing" card: whose turn it is, the round, and the Next turn button (or the guided steps during opening placement). */
export function TurnCard({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const current = state.players.find((p) => p.slot === state.currentPlayerSlot);
  const gem = current ? getGem(current.gem) : undefined;
  if (!current || !gem) return null;

  const opening = state.phase === 'opening' ? state.opening : null;
  const total = opening?.order.length ?? 0;
  const half = total / 2;

  return (
    <div className="rounded-2xl border bg-walnut p-3 shadow-deep" style={{ borderColor: gem.glow }}>
      <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">
        {opening ? `Opening · round ${opening.index < half ? 1 : 2} of 2` : `Round ${state.round}`}
      </div>
      <div className="mb-2.5 mt-2 flex items-center gap-2.5">
        <GemIcon gem={gem} size={38} />
        <div className="min-w-0">
          <div className="text-micro font-bold uppercase tracking-caps text-parchment-dim">Now playing</div>
          <div className="truncate font-display text-[24px] font-semibold leading-tight text-parchment">{current.name}</div>
        </div>
      </div>
      {opening ? (
        <div>
          <div className="text-small font-semibold text-parchment">
            {opening.step === 'settlement' ? 'Place a settlement anywhere legal' : 'Now a road next to it'}
          </div>
          <div className="mt-2 flex gap-1">
            {opening.order.map((_, i) => (
              <span
                key={i}
                className={['h-1 flex-1 rounded', i < opening.index ? 'bg-brass' : i === opening.index ? 'bg-brass-soft' : 'bg-[var(--line)]'].join(' ')}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => dispatch({ type: 'NEXT_TURN' })}
          title="Next turn (N)"
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-brass bg-brass px-3 py-2.5 text-label font-bold uppercase tracking-caps text-charred-oak transition-colors hover:bg-brass-soft"
        >
          Next turn <ChevronRight size={15} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}
