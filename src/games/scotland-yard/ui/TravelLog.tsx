import type { LogEntry } from '../types';
import { REVEAL_ROUNDS, TOTAL_ROUNDS } from '../data/graph';
import { TicketIcon } from './TicketChip';
import { BookOpen } from '../../../shared/icons';

/**
 * Mr. X's public travel log: 24 cells, one per move. Only the ticket he used is shown; on reveal rounds (★) the
 * station he moved to is written in. A double move fills two cells and is marked ×2.
 */
export function TravelLog({ log, nextRound }: { log: LogEntry[]; nextRound: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-walnut p-3 shadow-card">
      <div className="mb-2.5 flex items-center gap-2 text-label font-bold uppercase tracking-caps text-brass-soft">
        <BookOpen size={14} /> Mr. X travel log
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
          const round = i + 1;
          const entry = log[i];
          const reveal = REVEAL_ROUNDS.includes(round);
          return (
            <div
              key={round}
              className={[
                'relative flex h-[58px] flex-col items-center justify-between rounded-lg border py-1',
                reveal ? 'border-brass bg-brass/10' : 'border-[var(--line)] bg-charred-oak/40',
                round === nextRound ? 'ring-2 ring-parchment/70' : '',
              ].join(' ')}
            >
              <span className="font-mono text-micro font-bold text-parchment-dim">{round}</span>
              {entry ? <TicketIcon kind={entry.ticket} size={24} /> : <span className="h-6 w-6 rounded-md border border-dashed border-[var(--line)]" />}
              <span className="h-3 font-mono text-micro font-bold leading-3 text-brass-soft">{entry?.revealed ?? (reveal ? '★' : '')}</span>
              {entry?.double && <span className="absolute -right-1 -top-1 rounded bg-parchment px-1 font-mono text-micro font-bold text-charred-oak">×2</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
