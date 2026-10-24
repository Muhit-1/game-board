import { FERRY_LINKS, STATIONS } from './stations';
import type { StationData } from './stations';
import type { Transport } from '../types';

export const TOTAL_ROUNDS = 24;
/** Mr. X says where he is after his move in these rounds. */
export const REVEAL_ROUNDS = [3, 8, 13, 18, 24];

export const DETECTIVE_COUNT = 5;
export const PLAYER_COUNT = DETECTIVE_COUNT + 1;

/** Start cards the detectives draw their starting stations from (Mr. X picks his own on paper). */
export const DETECTIVE_STARTS = [13, 26, 29, 34, 50, 53, 91, 94, 103, 112, 117, 123, 138, 141, 155, 174, 197, 198];

export const STATION_BY_ID = new Map<number, StationData>(STATIONS.map((s) => [s.id, s]));

const ferryNeighbours = new Map<number, number[]>();
FERRY_LINKS.forEach(([a, b]) => {
  ferryNeighbours.set(a, [...(ferryNeighbours.get(a) ?? []), b]);
  ferryNeighbours.set(b, [...(ferryNeighbours.get(b) ?? []), a]);
});

/** The stations reachable from `id` by one transport. */
export function neighbours(id: number, transport: Transport): number[] {
  if (transport === 'ferry') return ferryNeighbours.get(id) ?? [];
  const station = STATION_BY_ID.get(id);
  return station ? station[transport] : [];
}

export const TRANSPORTS: Transport[] = ['taxi', 'bus', 'ug', 'ferry'];

/** What kind of stop a station is, for how it is drawn: underground stations are bus stops too. */
export function stationKind(station: StationData): 'taxi' | 'bus' | 'ug' {
  if (station.ug.length) return 'ug';
  if (station.bus.length) return 'bus';
  return 'taxi';
}
