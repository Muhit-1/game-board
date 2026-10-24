import { useEffect, useMemo, useReducer, useState } from 'react';
import { createInitialState, gameReducer } from './state';
import { detectiveMoves, detectivesOf, mrXOf } from './rules';
import type { MoveTicket } from './types';
import { saveLook } from './prefs';
import { SetupScreen } from './setup/SetupScreen';
import { MapView } from './board/MapView';
import { ArrangeCard, PlayerList, TurnCard, currentRound } from './ui/PlayersPanel';
import { TravelLog } from './ui/TravelLog';
import { TicketChooser } from './ui/TicketChooser';
import { WinDialog } from './ui/WinDialog';
import { AwardPopup, PlayerChip, TurnBanner } from '../../shared/components/Popups';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Toast } from '../../shared/components/Toast';
import { TableColourPicker } from '../../shared/components/TableColourPicker';
import { getGem } from '../../shared/theme/gems';
import { tableThemeStyle } from '../../shared/theme/tableThemes';
import { isMuted, playSound, setMuted } from '../../shared/sound/sounds';
import { Eye, Palette, RefreshCw, Undo2, Volume2, VolumeX } from '../../shared/icons';

const TICKET_ORDER: MoveTicket[] = ['taxi', 'bus', 'ug', 'black'];

function RoundButton({ label, onClick, disabled = false, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-[var(--line)] bg-walnut text-brass shadow-card transition-colors hover:bg-walnut-2 disabled:opacity-40 disabled:hover:bg-walnut"
    >
      {children}
    </button>
  );
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [muted, setMutedState] = useState(isMuted);
  const [chooser, setChooser] = useState<{ station: number; tickets: MoveTicket[] } | null>(null);
  const [banner, setBanner] = useState<{ id: number; name: string; gemId: string | null; kicker: string; durationMs?: number } | null>(null);
  const [reveal, setReveal] = useState<{ id: number; round: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<'caught' | 'trapped' | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  /** Map only: every panel goes away. Uses the browser's full screen when it allows it, otherwise just fills the window. */
  function toggleFullscreen(on = !fullscreen) {
    setFullscreen(on);
    try {
      if (on) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    } catch {
      /* the window-filling mode still works */
    }
  }

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const mrX = state.players.length ? mrXOf(state.players) : null;
  const detectives = useMemo(() => detectivesOf(state.players), [state.players]);
  const current = state.turn.side === 'mrx' ? mrX : state.players.find((p) => p.slot === (state.turn as { slot: number }).slot) ?? null;
  const currentGem = current ? getGem(current.gem) : undefined;
  const playing = state.phase === 'playing';

  /** Stations the moving detective can reach, with the tickets that work for each. */
  const targets = useMemo(() => {
    const map = new Map<number, MoveTicket[]>();
    if (state.phase !== 'playing' || state.turn.side !== 'detective' || state.revealPending !== null) return map;
    detectiveMoves(state, state.turn.slot).forEach((m) => {
      const tickets = map.get(m.station) ?? [];
      if (!tickets.includes(m.ticket)) tickets.push(m.ticket);
      tickets.sort((a, b) => TICKET_ORDER.indexOf(a) - TICKET_ORDER.indexOf(b));
      map.set(m.station, tickets);
    });
    return map;
  }, [state.phase, state.turn, state.positions, state.tickets, state.players, state.revealPending]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  // The turn passed to someone new: soft banner + ting.
  useEffect(() => {
    if (state.turnCue === 0 || !playing || !current) return;
    setChooser(null);
    setBanner({ id: state.turnCue, name: current.name, gemId: current.gem, kicker: state.turn.side === 'mrx' ? 'Mr. X to move' : 'Detective to move' });
    playSound('turn');
  }, [state.turnCue]);

  // Right after Start: organise the table before the chase begins.
  useEffect(() => {
    if (state.phase !== 'arrange') return;
    setBanner({ id: Date.now(), name: 'Organize your players', gemId: null, kicker: 'Before we start', durationMs: 3600 });
    playSound('turn');
  }, [state.phase === 'arrange']);

  // Reveal rounds: Mr. X shows himself.
  useEffect(() => {
    if (!state.revealEvent) return;
    setReveal(state.revealEvent);
    playSound('longest');
  }, [state.revealEvent]);

  // Detectives with no legal move are skipped.
  useEffect(() => {
    if (!state.skipNotice) return;
    const names = state.skipNotice.slots.map((s) => state.players.find((p) => p.slot === s)?.name).filter(Boolean);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    showNotice(`${list} ${names.length === 1 ? 'has' : 'have'} no move left — skipped.`);
    playSound('error');
  }, [state.skipNotice]);

  // The game ends.
  useEffect(() => {
    if (state.winner) {
      setWinDismissed(false);
      playSound('win');
    }
  }, [state.winner]);

  useEffect(() => {
    saveLook({ tableTheme: state.tableTheme });
  }, [state.tableTheme]);

  // Keyboard: Z = undo, F = full screen map, Esc leaves it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (confirmNew || confirmEnd || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        return void dispatch({ type: 'UNDO' });
      }
      if (e.ctrlKey || e.metaKey) return;
      if (key === 'z') dispatch({ type: 'UNDO' });
      if (key === 'f') toggleFullscreen();
      if (key === 'escape' && fullscreen) toggleFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmNew, confirmEnd, fullscreen]);

  if (state.phase === 'setup') return <SetupScreen state={state} dispatch={dispatch} />;

  function moveDetective(station: number, ticket: MoveTicket) {
    dispatch({ type: 'DETECTIVE_MOVE', station, ticket });
    setChooser(null);
    playSound('road');
  }

  function onStationClick(station: number) {
    if (state.revealPending !== null) {
      dispatch({ type: 'SET_LAST_SEEN', station });
      playSound('settlement');
      return;
    }
    const tickets = targets.get(station);
    if (!tickets) return;
    if (tickets.length === 1) moveDetective(station, tickets[0]);
    else setChooser({ station, tickets });
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playSound('turn');
  }

  const bannerGem = banner?.gemId ? getGem(banner.gemId) : undefined;
  const revealGem = mrX ? getGem(mrX.gem) : undefined;
  const movingTickets = state.turn.side === 'detective' ? state.tickets[state.turn.slot] : null;
  const round = currentRound(state);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden min-[1100px]:flex-row" style={tableThemeStyle(state.tableTheme)}>
      {/* Whose turn it is, readable from across the table: the screen edge glows in their colour. */}
      <div
        className="pointer-events-none fixed inset-0 z-[9] transform-gpu transition-[box-shadow] duration-500"
        style={{ boxShadow: currentGem && playing ? `inset 0 0 0 5px ${currentGem.glow}, inset 0 0 90px ${currentGem.glow}55` : undefined }}
      />

      <main
        className={
          fullscreen
            ? 'fixed inset-0 z-[8] transform-gpu p-1.5'
            : 'relative aspect-[13/9] max-h-[58vh] w-full shrink-0 transform-gpu p-3 min-[1100px]:aspect-auto min-[1100px]:max-h-none min-[1100px]:min-h-0 min-[1100px]:w-auto min-[1100px]:flex-1'
        }
      >
        <MapView
          pawns={detectives.map((d) => ({ slot: d.slot, gem: d.gem, station: state.positions[d.slot] }))}
          lastSeen={state.lastSeen}
          targets={targets}
          picking={state.revealPending !== null}
          onStationClick={onStationClick}
          fullscreen={fullscreen}
          onToggleFullscreen={() => toggleFullscreen()}
        />
      </main>

      <aside className={`z-10 flex min-h-0 w-full flex-1 flex-col gap-2.5 overflow-y-auto p-3 scrollbar-ironwood min-[1100px]:w-[clamp(340px,24vw,440px)] min-[1100px]:flex-none min-[1100px]:pl-0 ${fullscreen ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-[24px] font-semibold text-[color:var(--on-table)]">Scotland Yard</h1>
          <div className="flex gap-2">
            <RoundButton label={muted ? 'Unmute sounds' : 'Mute sounds'} onClick={toggleSound}>
              {muted ? <VolumeX size={17} strokeWidth={1.9} /> : <Volume2 size={17} strokeWidth={1.9} />}
            </RoundButton>
            <RoundButton label="Undo the last move (Z)" onClick={() => dispatch({ type: 'UNDO' })} disabled={state.history.length === 0}>
              <Undo2 size={17} strokeWidth={1.9} />
            </RoundButton>
            <RoundButton label="Table colour" onClick={() => setShowPalette((v) => !v)}>
              <Palette size={17} strokeWidth={1.9} />
            </RoundButton>
            <RoundButton label="New game" onClick={() => setConfirmNew(true)}>
              <RefreshCw size={17} strokeWidth={1.9} />
            </RoundButton>
          </div>
        </div>

        {showPalette && (
          <div className="rounded-2xl border border-[var(--line)] bg-walnut p-3 shadow-card">
            <TableColourPicker value={state.tableTheme} onChange={(theme) => dispatch({ type: 'SET_TABLE_THEME', theme })} />
          </div>
        )}

        {state.phase === 'arrange' ? <ArrangeCard dispatch={dispatch} /> : <TurnCard state={state} dispatch={dispatch} onMrXLogged={() => playSound('road')} onEnd={setConfirmEnd} />}

        {chooser && movingTickets && (
          <TicketChooser
            station={chooser.station}
            tickets={chooser.tickets}
            counts={{ taxi: movingTickets.taxi, bus: movingTickets.bus, ug: movingTickets.ug, black: 0 }}
            onPick={(t) => moveDetective(chooser.station, t)}
            onCancel={() => setChooser(null)}
          />
        )}

        <PlayerList state={state} dispatch={dispatch} />
        <TravelLog log={state.log} nextRound={state.phase === 'playing' ? state.log.length + 1 : 0} />
        <div className="text-center text-label text-[color:var(--on-table-dim)]">
          {round > 0 && playing ? `${state.log.length} of 24 Mr. X moves logged` : ''}
        </div>
      </aside>

      {fullscreen && state.revealPending !== null && (
        <div className="fixed left-1/2 top-3 z-[45] flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-brass bg-charred-oak/95 py-2 pl-5 pr-2 shadow-deep">
          <span className="text-body font-bold text-parchment">{mrX?.name} says where he is. Tap that station.</span>
          <button type="button" onClick={() => dispatch({ type: 'SKIP_REVEAL' })} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-label font-bold uppercase tracking-caps text-parchment hover:bg-walnut-2">
            Skip
          </button>
        </div>
      )}
      <Toast message={notice} />
      {banner && <TurnBanner id={banner.id} kicker={banner.kicker} name={banner.name} gem={bannerGem} durationMs={banner.durationMs} onDone={() => setBanner(null)} />}
      {reveal && revealGem && mrX && (
        <AwardPopup
          id={reveal.id}
          icon={<Eye size={26} strokeWidth={2} />}
          kicker={`Round ${reveal.round} · reveal`}
          title="Mr. X, where are you?"
          who={<PlayerChip gem={revealGem} name={mrX.name} />}
          sub="Say your station out loud. Everyone taps it on the map to mark it."
          onClose={() => setReveal(null)}
        />
      )}
      {state.winner && !winDismissed && (
        <WinDialog state={state} onNewGame={() => dispatch({ type: 'NEW_GAME' })} onUndo={() => dispatch({ type: 'UNDO' })} onLookAtMap={() => setWinDismissed(true)} />
      )}
      {confirmEnd && (
        <ConfirmDialog
          message={confirmEnd === 'caught' ? 'A detective landed on Mr. X? The detectives win.' : 'Mr. X has no move left? The detectives win.'}
          confirmLabel="Detectives win"
          onConfirm={() => {
            dispatch({ type: 'END_GAME', reason: confirmEnd });
            setConfirmEnd(null);
          }}
          onCancel={() => setConfirmEnd(null)}
        />
      )}
      {confirmNew && (
        <ConfirmDialog
          message="Start a new game? This clears the map, the players and the travel log."
          confirmLabel="New Game"
          onConfirm={() => {
            dispatch({ type: 'NEW_GAME' });
            setConfirmNew(false);
          }}
          onCancel={() => setConfirmNew(false)}
        />
      )}
    </div>
  );
}
