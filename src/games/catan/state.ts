import type { BuildMode, DevCardLegendRow, GameState, Player } from './types';
import { generateBoard } from './board/generateBoard';

export type { GameState } from './types';

export const DEFAULT_DEV_CARD_LEGEND: DevCardLegendRow[] = [
  { id: 'ace', label: 'A / Joker', meaning: 'Victory Point' },
  { id: 'king', label: 'K', meaning: 'Monopoly' },
  { id: 'queen', label: 'Q', meaning: 'Year of Plenty' },
  { id: 'jack', label: 'J', meaning: 'Road Building' },
  { id: 'number', label: 'Numbered cards', meaning: 'Knight' },
];

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayerSlot: 0,
    buildMode: null,
    board: generateBoard(),
    devCardLegend: DEFAULT_DEV_CARD_LEGEND,
    manualScores: {},
  };
}

export type GameAction =
  | { type: 'START_GAME'; players: Player[] }
  | { type: 'RESUME_SETUP'; players: Player[] }
  | { type: 'SET_BUILD_MODE'; mode: BuildMode }
  | { type: 'SET_CURRENT_PLAYER'; slot: number }
  | { type: 'PLACE_BUILDING'; vertexId: number }
  | { type: 'PLACE_ROAD'; edgeId: number }
  | { type: 'MOVE_ROBBER'; hexId: number }
  | { type: 'ERASE_VERTEX'; vertexId: number }
  | { type: 'ERASE_EDGE'; edgeId: number }
  | { type: 'SHUFFLE_BOARD' }
  | { type: 'NEW_GAME' }
  | { type: 'REOPEN_SETUP' }
  | { type: 'UPDATE_DEV_CARD_LEGEND'; rows: DevCardLegendRow[] }
  | { type: 'SET_LARGEST_ARMY'; slot: number | null }
  | { type: 'ADJUST_DEV_VP'; slot: number; delta: number };

function emptyManualScores(players: Player[]): GameState['manualScores'] {
  const scores: GameState['manualScores'] = {};
  players.forEach((p) => {
    scores[p.slot] = { hasLargestArmy: false, devCardVictoryPoints: 0 };
  });
  return scores;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
        players: action.players,
        currentPlayerSlot: action.players[0]?.slot ?? 0,
        buildMode: null,
        board: generateBoard(),
        manualScores: emptyManualScores(action.players),
      };

    case 'RESUME_SETUP':
      return { ...state, phase: 'playing', players: action.players };

    case 'SET_BUILD_MODE':
      return { ...state, buildMode: action.mode };

    case 'SET_CURRENT_PLAYER':
      return { ...state, currentPlayerSlot: action.slot };

    case 'PLACE_BUILDING': {
      if (state.buildMode !== 'settlement' && state.buildMode !== 'city') return state;
      const vertices = state.board.vertices.map((v) => {
        if (v.id !== action.vertexId) return v;
        if (state.buildMode === 'settlement') {
          if (v.building) return v;
          return { ...v, building: { playerId: state.currentPlayerSlot, type: 'settlement' as const } };
        }
        // city: upgrades the current player's own settlement
        if (v.building?.playerId === state.currentPlayerSlot && v.building.type === 'settlement') {
          return { ...v, building: { playerId: state.currentPlayerSlot, type: 'city' as const } };
        }
        return v;
      });
      return { ...state, board: { ...state.board, vertices } };
    }

    case 'PLACE_ROAD': {
      if (state.buildMode !== 'road') return state;
      const edges = state.board.edges.map((e) => {
        if (e.id !== action.edgeId || e.road) return e;
        return { ...e, road: { playerId: state.currentPlayerSlot } };
      });
      return { ...state, board: { ...state.board, edges } };
    }

    case 'MOVE_ROBBER': {
      if (state.buildMode !== 'robber') return state;
      return { ...state, board: { ...state.board, robberHexId: action.hexId } };
    }

    case 'ERASE_VERTEX': {
      const vertices = state.board.vertices.map((v) => (v.id === action.vertexId ? { ...v, building: null } : v));
      return { ...state, board: { ...state.board, vertices } };
    }

    case 'ERASE_EDGE': {
      const edges = state.board.edges.map((e) => (e.id === action.edgeId ? { ...e, road: null } : e));
      return { ...state, board: { ...state.board, edges } };
    }

    case 'SHUFFLE_BOARD':
      return {
        ...state,
        board: generateBoard(),
        manualScores: emptyManualScores(state.players),
      };

    case 'NEW_GAME':
      return {
        ...state,
        phase: 'setup',
        players: [],
        buildMode: null,
        board: generateBoard(),
        manualScores: {},
      };

    case 'REOPEN_SETUP':
      return { ...state, phase: 'setup' };

    case 'UPDATE_DEV_CARD_LEGEND':
      return { ...state, devCardLegend: action.rows };

    case 'SET_LARGEST_ARMY': {
      const manualScores: GameState['manualScores'] = {};
      Object.entries(state.manualScores).forEach(([slot, score]) => {
        manualScores[Number(slot)] = { ...score, hasLargestArmy: Number(slot) === action.slot };
      });
      state.players.forEach((p) => {
        if (!manualScores[p.slot]) manualScores[p.slot] = { hasLargestArmy: p.slot === action.slot, devCardVictoryPoints: 0 };
      });
      return { ...state, manualScores };
    }

    case 'ADJUST_DEV_VP': {
      const current = state.manualScores[action.slot] ?? { hasLargestArmy: false, devCardVictoryPoints: 0 };
      const devCardVictoryPoints = Math.max(0, current.devCardVictoryPoints + action.delta);
      return {
        ...state,
        manualScores: { ...state.manualScores, [action.slot]: { ...current, devCardVictoryPoints } },
      };
    }

    default:
      return state;
  }
}
