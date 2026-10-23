import type { MoveTicket } from './types';

/** The colours of the tickets, shared by the map highlights, the player cards and the travel log. */
export const TICKET_COLORS: Record<MoveTicket, string> = {
  taxi: '#e0a800',
  bus: '#2f9e55',
  ug: '#d6403f',
  black: '#1c1c1c',
};

export const TICKET_LABELS: Record<MoveTicket, string> = {
  taxi: 'Taxi',
  bus: 'Bus',
  ug: 'Underground',
  black: 'Black',
};
