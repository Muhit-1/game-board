import type { MoveTicket } from '../types';
import { TICKET_LABELS } from '../ticketStyle';
import { TicketIcon } from './TicketChip';

interface TicketChooserProps {
  station: number;
  tickets: MoveTicket[];
  counts: Record<MoveTicket, number>;
  onPick: (ticket: MoveTicket) => void;
  onCancel: () => void;
}

/** Shown when a station can be reached with more than one ticket: pick which one to spend. */
export function TicketChooser({ station, tickets, counts, onPick, onCancel }: TicketChooserProps) {
  return (
    <div className="rounded-2xl border border-brass bg-walnut p-3 shadow-deep">
      <div className="mb-2 text-label font-bold uppercase tracking-caps text-brass-soft">
        Move to station <span className="font-mono text-parchment">{station}</span> with…
      </div>
      <div className="flex gap-2">
        {tickets.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-[var(--line)] bg-charred-oak/40 py-2 text-label font-bold text-parchment hover:border-brass hover:bg-walnut-2"
          >
            <TicketIcon kind={t} size={26} />
            {TICKET_LABELS[t]}
            <span className="font-mono text-micro text-parchment-dim">{counts[t]} left</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="mt-2 w-full text-label font-semibold text-parchment-dim hover:text-parchment">
        Cancel
      </button>
    </div>
  );
}
