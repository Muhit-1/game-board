import type { ReactNode } from 'react';
import { Bus, Car, Copy, EyeOff, Ship, TrainFront } from '../../../shared/icons';
import type { MoveTicket } from '../types';
import { TICKET_COLORS } from '../ticketStyle';

export type ChipKind = MoveTicket | 'double' | 'ferry';

const ICONS: Record<ChipKind, ReactNode> = {
  taxi: <Car size={13} />,
  bus: <Bus size={13} />,
  ug: <TrainFront size={13} />,
  black: <EyeOff size={13} />,
  double: <Copy size={13} />,
  ferry: <Ship size={13} />,
};

const COLORS: Record<ChipKind, string> = { ...TICKET_COLORS, double: '#555', ferry: '#1c1c1c' };

/** Tiny icon in a coloured square: the ticket's identity everywhere (cards, log, chooser). */
export function TicketIcon({ kind, size = 24 }: { kind: ChipKind; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md"
      style={{ width: size, height: size, background: COLORS[kind], color: kind === 'taxi' ? '#2b2016' : '#fff' }}
    >
      {ICONS[kind]}
    </span>
  );
}

/** A ticket icon followed by a count, e.g. the taxi tickets a detective has left. */
export function TicketChip({ kind, count }: { kind: ChipKind; count: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md py-0.5 pl-1.5 pr-2 font-mono text-label font-bold"
      style={{ background: COLORS[kind], color: kind === 'taxi' ? '#2b2016' : '#fff', opacity: count === 0 ? 0.45 : 1 }}
    >
      {ICONS[kind]}
      {count}
    </span>
  );
}
