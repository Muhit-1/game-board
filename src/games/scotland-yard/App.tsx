import { useEffect, useMemo, useReducer, useState } from 'react';
import { createInitialState, gameReducer } from './state';
import { detectiveMoves, detectivesOf, mrXOf } from './rules';
import type { MoveTicket } from './types';
import { saveLook } from './prefs';
import { SetupScreen } from './setup/SetupScreen';
import { MapView } from './board/MapView';
import { ArrangeCard, PlayerList, TurnCard, currentRound } from './ui/PlayersPanel';
import { TravelLog } from './ui/TravelLog';
import { SecretPad } from './ui/SecretPad';
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
  const [secretOpen, setSecretOpen] = useState(false);
  const [chooser, setChooser] = useState<{ station: number; tickets: MoveTicket[] } | null>(null);
  const [banner, setBanner] = useState<{ id: number; name: string; gemId: string | null; kicker: string; durationMs?: number } | null>(null);
  const [reveal, setReveal] = useState<{ id: number; round: number; station: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [winDismissed, setWinDismissed] = useState(false);

  const mrX = state.players.length ? mrXOf(state.players) : null;
  const detectives = useMemo(() => detectivesOf(state.players), [state.players]);
  const current = state.turn.side === 'mrx' ? mrX : state.players.find((p) => p.slot === (state.turn as { slot: number }).slot) ?? null;
  const currentGem = current ? getGem(current.gem) : undefined;
  const playing = state.phase === 'playing';

  /** Stations the moving detective can reach, with the tickets that work for each. */
  const targets = useMemo(() => {
    const map = new Map<number, MoveTicket[]>();
    if (state.phase !== 'playing' || state.turn.side !== 'detective') return map;
    detectiveMoves(state, state.turn.slot).forEach((m) => {
      const tickets = map.get(m.station) ?? [];
      if (!tickets.includes(m.ticket)) tickets.push(m.ticket);
      tickets.sort((a, b) => TICKET_ORDER.indexOf(a) - TICKET_ORDER.indexOf(b));
      map.set(m.station, tickets);
    });
    return map;
  }, [state.phase, state.turn, state.positions, state.tickets, state.players]);

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
      setSecretOpen(false);
      playSound('win');
    }
  }, [state.winner]);

  useEffect(() => {
    saveLook({ tableTheme: state.tableTheme });
  }, [state.tableTheme]);

  // Keyboard: X = Mr. X's secret move, Z = undo.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (confirmNew || secretOpen || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        return void dispatch({ type: 'UNDO' });
      }
      if (e.ctrlKey || e.metaKey) return;
      if (key === 'z') dispatch({ type: 'UNDO' });
      if (key === 'x' && playing && state.turn.side === 'mrx') setSecretOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmNew, secretOpen, playing, state.turn]);

  if (state.phase === 'setup') return <SetupScreen state={state} dispatch={dispatch} />;

  function moveDetective(station: number, ticket: MoveTicket) {
    dispatch({ type: 'DETECTIVE_MOVE', station, ticket });
    setChooser(null);
    playSound('road');
  }

  function onStationClick(station: number) {
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

      <main className="relative min-h-0 flex-1 transform-gpu p-3">
        <MapView
          pawns={detectives.map((d) => ({ slot: d.slot, gem: d.gem, station: state.positions[d.slot] }))}
          lastSeen={state.lastSeen}
          targets={targets}
          revealedStation={state.phase === 'finished' && mrX ? state.positions[mrX.slot] : null}
          onStationClick={onStationClick}
        />
      </main>

      <aside className="z-10 flex max-h-[46vh] w-full shrink-0 flex-col gap-2.5 overflow-y-auto p-3 scrollbar-ironwood min-[1100px]:max-h-none min-[1100px]:w-[clamp(340px,24vw,440px)] min-[1100px]:pl-0">
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

        {state.phase === 'arrange' ? <ArrangeCard dispatch={dispatch} /> : <TurnCard state={state} onOpenSecret={() => setSecretOpen(true)} />}

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
        <div className="text-center text-label text-parchment-dim/80">
          {round > 0 && playing ? `${state.log.length} of 24 Mr. X moves logged` : ''}
        </div>
      </aside>

      <Toast message={notice} />
      {banner && <TurnBanner id={banner.id} kicker={banner.kicker} name={banner.name} gem={bannerGem} durationMs={banner.durationMs} onDone={() => setBanner(null)} />}
      {reveal && revealGem && mrX && (
        <AwardPopup
          id={reveal.id}
          icon={<Eye size={26} strokeWidth={2} />}
          kicker={`Round ${reveal.round} · reveal`}
          title="Mr. X shows himself"
          who={<PlayerChip gem={revealGem} name={mrX.name} />}
          sub={
            <>
              He is at station <b className="text-brass-soft">{reveal.station}</b>
            </>
          }
          onClose={() => setReveal(null)}
        />
      )}
      {secretOpen && playing && (
        <SecretPad state={state} dispatch={dispatch} onClose={() => setSecretOpen(false)} onMoved={() => playSound('settlement')} />
      )}
      {state.winner && !winDismissed && (
        <WinDialog state={state} onNewGame={() => dispatch({ type: 'NEW_GAME' })} onUndo={() => dispatch({ type: 'UNDO' })} onLookAtMap={() => setWinDismissed(true)} />
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
