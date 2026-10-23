import { useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import type { MoveTicket } from '../types';
import { mrXOf, validateMrXMove } from '../rules';
import { TOTAL_ROUNDS } from '../data/graph';
import { TICKET_COLORS, TICKET_LABELS } from '../ticketStyle';
import { Check, Copy, Delete, Eye, EyeOff, X } from '../../../shared/icons';
import { TicketIcon } from './TicketChip';

type Stage = 'curtain' | 'pad' | 'done';

const IDLE_CLOSE_MS = 45000;
const TICKETS: MoveTicket[] = ['taxi', 'bus', 'ug', 'black'];

interface SecretPadProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
  onMoved: () => void;
}

/**
 * Mr. X's private move entry. A full-screen curtain hides the map from the detectives first; the pad masks the station
 * number as it is typed, checks the move is legal without hinting at where else he could go, and logs only the ticket.
 */
export function SecretPad({ state, dispatch, onClose, onMoved }: SecretPadProps) {
  const mrX = mrXOf(state.players);
  const [stage, setStage] = useState<Stage>('curtain');
  const [digits, setDigits] = useState('');
  const [ticket, setTicket] = useState<MoveTicket>('taxi');
  const [double, setDouble] = useState(false);
  const [peek, setPeek] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const movesAtOpen = useRef(state.log.length);

  const tickets = state.tickets[mrX.slot];
  const lastEntry = state.log[state.log.length - 1];
  const canDouble = tickets.double > 0 && !state.doublePending && state.log.length <= TOTAL_ROUNDS - 2;

  // Any activity keeps the pad open; 45 s of silence drops the curtain again so a forgotten pad never shows the number.
  function touch() {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      setDigits('');
      setStage('curtain');
    }, IDLE_CLOSE_MS);
  }
  useEffect(() => {
    if (stage === 'pad') touch();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [stage]);

  function press(d: string) {
    touch();
    setMessage(null);
    setDigits((current) => (current.length < 3 ? current + d : current));
  }

  function confirm() {
    touch();
    const station = Number(digits);
    if (!digits || !Number.isInteger(station)) return setMessage('Type a station number first.');
    const result = validateMrXMove(state, station, ticket);
    if (!result.valid) {
      setDigits('');
      return setMessage(result.reason ?? "You can't go there.");
    }
    dispatch({ type: 'MRX_MOVE', station, ticket, double: double && canDouble });
    setDigits('');
    setDouble(false);
    setMessage(null);
    onMoved();
    setStage('done');
  }

  // Esc closes; digits / Backspace / Enter work from a real keyboard too.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') return onClose();
      if (stage !== 'pad') return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setDigits((d) => d.slice(0, -1));
      else if (e.key === 'Enter') confirm();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const masked = digits.length ? (peek ? digits : '•'.repeat(digits.length)) : '';
  const shell = 'fixed inset-0 z-[70] flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgb(var(--walnut-rgb)),rgb(var(--charred-oak-rgb)))] p-4';

  if (stage === 'curtain') {
    return (
      <div className={shell}>
        <div className="flex max-w-sm flex-col items-center gap-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#555] bg-black text-white">
            <EyeOff size={42} />
          </div>
          <div className="font-display text-[34px] font-semibold leading-tight text-parchment">Detectives, look away</div>
          <p className="text-md text-parchment-dim">
            Pass the device to <b className="text-parchment">{mrX.name}</b> (Mr. X).
          </p>
          <button
            type="button"
            onClick={() => setStage(state.log.length > movesAtOpen.current && !state.doublePending ? 'done' : 'pad')}
            className="rounded-xl border border-brass bg-brass px-6 py-3 text-body font-bold uppercase tracking-caps text-charred-oak hover:bg-brass-soft"
          >
            I'm Mr. X — open my pad
          </button>
          <button type="button" onClick={onClose} className="text-small font-semibold text-parchment-dim underline-offset-4 hover:underline">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'done') {
    const revealed = lastEntry?.revealed != null;
    return (
      <div className={shell}>
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          {lastEntry && (
            <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: TICKET_COLORS[lastEntry.ticket], color: lastEntry.ticket === 'taxi' ? '#2b2016' : '#fff' }}>
              <TicketIcon kind={lastEntry.ticket} size={44} />
            </div>
          )}
          <div className="font-display text-[30px] font-semibold text-parchment">Move logged</div>
          <p className="text-md text-parchment-dim">
            Round {lastEntry?.round} · <b className="text-parchment">{lastEntry ? TICKET_LABELS[lastEntry.ticket] : ''}</b>
          </p>
          {revealed && (
            <div className="rounded-xl border border-brass bg-brass/10 px-4 py-2.5 text-small text-parchment">
              <b className="mb-0.5 block text-micro uppercase tracking-kicker text-brass-soft">Reveal round</b>
              The board will announce your station.
            </div>
          )}
          {state.doublePending ? (
            <>
              <p className="text-small text-parchment-dim">Double move — now your second move.</p>
              <button type="button" onClick={() => setStage('pad')} className="rounded-xl border border-brass bg-brass px-6 py-3 text-body font-bold uppercase tracking-caps text-charred-oak hover:bg-brass-soft">
                Enter the second move
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="rounded-xl border border-brass bg-brass px-6 py-3 text-body font-bold uppercase tracking-caps text-charred-oak hover:bg-brass-soft">
              Back to the map
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-walnut p-5 shadow-deep">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">Only Mr. X looks at this</div>
            <div className="font-display text-[26px] font-semibold leading-tight text-parchment">Where do you go?</div>
            <div className="mt-1 text-small text-parchment-dim">
              You are at station <b className="font-mono text-parchment">{state.positions[mrX.slot]}</b>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close the pad" className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-parchment-dim hover:bg-walnut-2">
            <X size={15} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-charred-oak/60 py-3 font-mono text-[34px] font-bold tracking-[0.3em] text-parchment">
          <span className="min-w-[3ch] text-center">{masked || <span className="opacity-30">_ _ _</span>}</span>
          <button
            type="button"
            aria-label="Hold to show the number"
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            className="text-parchment-dim"
          >
            {peek ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {TICKETS.map((t) => {
            const disabled = t === 'black' && tickets.black <= 0;
            const on = ticket === t;
            return (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => {
                  touch();
                  setTicket(t);
                }}
                className={['flex flex-col items-center gap-1 rounded-lg border py-2 text-label font-bold transition-colors disabled:opacity-35', on ? 'border-brass bg-walnut-2 text-parchment' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2'].join(' ')}
              >
                <TicketIcon kind={t} size={22} />
                {t === 'ug' ? 'UG' : TICKET_LABELS[t]}
                {t === 'black' && <span className="font-mono text-micro text-parchment-dim">×{tickets.black}</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canDouble}
          onClick={() => {
            touch();
            setDouble((d) => !d);
          }}
          className={['mt-2 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-label font-bold uppercase tracking-caps transition-colors disabled:opacity-35', double ? 'border-brass bg-brass/15 text-brass-soft' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2'].join(' ')}
        >
          <Copy size={14} /> Double move <span className="font-mono">×{tickets.double}</span>
        </button>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} className="h-12 rounded-xl border border-[var(--line)] bg-walnut-2 font-mono text-[22px] font-bold text-parchment hover:bg-charred-oak">
              {d}
            </button>
          ))}
          <button type="button" aria-label="Delete a digit" onClick={() => setDigits((d) => d.slice(0, -1))} className="flex h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-walnut-2 text-parchment hover:bg-charred-oak">
            <Delete size={20} />
          </button>
          <button type="button" onClick={() => press('0')} className="h-12 rounded-xl border border-[var(--line)] bg-walnut-2 font-mono text-[22px] font-bold text-parchment hover:bg-charred-oak">
            0
          </button>
          <button type="button" aria-label="Confirm the move" onClick={confirm} className="flex h-12 items-center justify-center rounded-xl border border-brass bg-brass text-charred-oak hover:bg-brass-soft">
            <Check size={22} strokeWidth={2.6} />
          </button>
        </div>

        <div className="mt-3 min-h-[20px] text-center text-small font-semibold text-ember">{message}</div>
        <div className="text-center text-label text-parchment-dim">Numbers are masked · the pad closes itself after 45 s of silence</div>
      </div>
    </div>
  );
}
