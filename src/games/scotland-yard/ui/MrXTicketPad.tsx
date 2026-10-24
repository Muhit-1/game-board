import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import type { MoveTicket } from '../types';
import { mrXOf } from '../rules';
import { TOTAL_ROUNDS } from '../data/graph';
import { TICKET_LABELS } from '../ticketStyle';
import { Copy } from '../../../shared/icons';
import { TicketIcon } from './TicketChip';

const TICKETS: MoveTicket[] = ['taxi', 'bus', 'ug', 'black'];

interface MrXTicketPadProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onLogged: () => void;
}

/** Mr. X moves on his own paper notepad, then says which ticket he used; one tap logs it for the table. */
export function MrXTicketPad({ state, dispatch, onLogged }: MrXTicketPadProps) {
  const [double, setDouble] = useState(false);
  const tickets = state.tickets[mrXOf(state.players).slot];
  const second = state.doublePending;
  const canDouble = tickets.double > 0 && !second && state.log.length <= TOTAL_ROUNDS - 2;
  const blocked = state.revealPending !== null;

  function log(ticket: MoveTicket) {
    dispatch({ type: 'MRX_TICKET', ticket, double: double && canDouble });
    setDouble(false);
    onLogged();
  }

  return (
    <div>
      <p className="mb-2 text-small font-semibold leading-snug text-parchment">
        {second ? 'Double move: tap the ticket for his second move.' : 'Mr. X writes his move on his notepad, then taps the ticket he used.'}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {TICKETS.map((t) => {
          const out = t === 'black' && tickets.black <= 0;
          return (
            <button
              key={t}
              type="button"
              disabled={out || blocked}
              onClick={() => log(t)}
              className="flex flex-col items-center gap-1 rounded-lg border border-[var(--line)] bg-charred-oak/40 py-2 text-label font-bold text-parchment transition-colors hover:border-brass hover:bg-walnut-2 disabled:opacity-35 disabled:hover:border-[var(--line)] disabled:hover:bg-charred-oak/40"
            >
              <TicketIcon kind={t} size={24} />
              {t === 'ug' ? 'UG' : TICKET_LABELS[t]}
              {t === 'black' && <span className="font-mono text-micro text-parchment-dim">×{tickets.black}</span>}
            </button>
          );
        })}
      </div>
      {!second && (
        <button
          type="button"
          disabled={!canDouble || blocked}
          aria-pressed={double}
          onClick={() => setDouble((d) => !d)}
          className={[
            'mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-label font-bold uppercase tracking-caps transition-colors disabled:opacity-35',
            double ? 'border-brass bg-brass/15 text-brass-soft' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
          ].join(' ')}
        >
          <Copy size={14} /> Double move <span className="font-mono">×{tickets.double}</span>
        </button>
      )}
    </div>
  );
}
