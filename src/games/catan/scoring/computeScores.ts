import type { Board, ManualScore } from '../types';
import { computeLongestRoadHolder } from './longestRoad';

export interface PlayerScoreBreakdown {
  settlements: number;
  cities: number;
  longestRoad: number;
  largestArmy: number;
  devCardVictoryPoints: number;
  total: number;
}

export function computeScores(
  board: Board,
  playerSlots: number[],
  manualScores: Record<number, ManualScore>,
): Record<number, PlayerScoreBreakdown> {
  const longestRoadHolder = computeLongestRoadHolder(board.edges, playerSlots);

  const result: Record<number, PlayerScoreBreakdown> = {};
  playerSlots.forEach((slot) => {
    const settlements = board.vertices.filter((v) => v.building?.playerId === slot && v.building.type === 'settlement').length;
    const cities = board.vertices.filter((v) => v.building?.playerId === slot && v.building.type === 'city').length;
    const manual = manualScores[slot] ?? { hasLargestArmy: false, devCardVictoryPoints: 0 };
    const longestRoad = longestRoadHolder === slot ? 2 : 0;
    const largestArmy = manual.hasLargestArmy ? 2 : 0;

    result[slot] = {
      settlements,
      cities: cities * 2,
      longestRoad,
      largestArmy,
      devCardVictoryPoints: manual.devCardVictoryPoints,
      total: settlements + cities * 2 + longestRoad + largestArmy + manual.devCardVictoryPoints,
    };
  });

  return result;
}
