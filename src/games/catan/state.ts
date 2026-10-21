import type { Board, BoardKind, BoardStyle, BuildMode, BuildingType, DevCardLegendRow, GameState, OpeningState, Player, Snapshot } from './types';
import { generateBoard } from './board/generateBoard';
import { GEMS } from '../../shared/theme/gems';
import type { TableThemeId } from '../../shared/theme/tableThemes';
import { loadLook } from './prefs';
import { computeLongestRoad } from './scoring/longestRoad';
import { canPlaceRoad, canPlaceSettlement, canUpgradeToCity } from './rules';

export type { GameState } from './types';

export const DEFAULT_DEV_CARD_LEGEND: DevCardLegendRow[] = [
  { id: 'ace', label: 'A / Joker', meaning: 'Victory Point' },
  { id: 'king', label: 'K', meaning: 'Monopoly' },
  { id: 'queen', label: 'Q', meaning: 'Year of Plenty' },
  { id: 'jack', label: 'J', meaning: 'Road Building' },
  { id: 'number', label: 'Numbered cards', meaning: 'Knight' },
];

export const MAX_NAME_LENGTH = 14;
const HISTORY_LIMIT = 100;

export function createInitialState(): GameState {
  const look = loadLook();
  return {
    phase: 'setup',
    players: [],
    currentPlayerSlot: 0,
    round: 1,
    buildMode: null,
    board: generateBoard('standard'),
    boardKind: 'standard',
    opening: null,
    setupReturn: null,
    devCardLegend: DEFAULT_DEV_CARD_LEGEND,
    boardStyle: look.boardStyle,
    tableTheme: look.tableTheme,
    manualScores: {},
    longestRoadHolder: null,
    lrEvent: null,
    eventSeq: 0,
    turnCue: 0,
    history: [],
  };
}

export type GameAction =
  | { type: 'START_GAME'; players: Player[]; board: Board; boardKind: BoardKind }
  | { type: 'RESUME_SETUP'; players: Player[] }
  | { type: 'SET_BOARD_STYLE'; style: BoardStyle }
  | { type: 'SET_TABLE_THEME'; theme: TableThemeId }
  | { type: 'BEGIN_OPENING' }
  | { type: 'SET_PLAYER_GEM'; slot: number; gem: string }
  | { type: 'SET_BUILD_MODE'; mode: BuildMode }
  | { type: 'SET_CURRENT_PLAYER'; slot: number }
  | { type: 'NEXT_TURN' }
  | { type: 'REORDER_PLAYERS'; slot: number; toIndex: number }
  | { type: 'RENAME_PLAYER'; slot: number; name: string }
  | { type: 'PLACE_BUILDING'; vertexId: number }
  | { type: 'PLACE_ROAD'; edgeId: number }
  | { type: 'MOVE_ROBBER'; hexId: number }
  | { type: 'ERASE_VERTEX'; vertexId: number }
  | { type: 'ERASE_EDGE'; edgeId: number }
  | { type: 'UNDO' }
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

/** Snake order: 1..N, then N..1 — the last player places twice in a row. */
function openingFor(players: Player[]): OpeningState {
  const slots = players.map((p) => p.slot);
  return { order: [...slots, ...[...slots].reverse()], index: 0, step: 'settlement', settlementVertexId: null };
}

function openingBuildMode(opening: OpeningState): BuildMode {
  return opening.step === 'settlement' ? 'settlement' : 'road';
}

function snapshot(state: GameState): Snapshot {
  return {
    board: state.board,
    phase: state.phase,
    opening: state.opening,
    round: state.round,
    longestRoadHolder: state.longestRoadHolder,
  };
}

function pushHistory(state: GameState): Snapshot[] {
  return [...state.history.slice(-(HISTORY_LIMIT - 1)), snapshot(state)];
}

/** Commits a new board and re-evaluates Longest Road, emitting an event if the title changed hands. */
function withBoard(state: GameState, board: Board): GameState {
  const { holder, lengths } = computeLongestRoad(
    board,
    state.players.map((p) => p.slot),
    state.longestRoadHolder,
  );
  const next = { ...state, board, longestRoadHolder: holder };
  if (holder === state.longestRoadHolder) return next;

  const eventSeq = state.eventSeq + 1;
  const kind = holder === null ? 'lost' : state.longestRoadHolder === null ? 'gain' : 'steal';
  return {
    ...next,
    eventSeq,
    lrEvent: { id: eventSeq, kind, slot: holder, previousSlot: state.longestRoadHolder, length: holder === null ? 0 : lengths[holder] },
  };
}

function setBuilding(board: Board, vertexId: number, building: { playerId: number; type: BuildingType } | null): Board {
  return { ...board, vertices: board.vertices.map((v) => (v.id === vertexId ? { ...v, building } : v)) };
}

function setRoad(board: Board, edgeId: number, road: { playerId: number } | null): Board {
  return { ...board, edges: board.edges.map((e) => (e.id === edgeId ? { ...e, road } : e)) };
}

function startOpening(state: GameState, board: Board, boardKind: BoardKind, players: Player[]): GameState {
  const opening = openingFor(players);
  return {
    ...state,
    phase: 'opening',
    players,
    board,
    boardKind,
    opening,
    setupReturn: null,
    currentPlayerSlot: opening.order[0],
    round: 1,
    buildMode: 'settlement',
    manualScores: emptyManualScores(players),
    longestRoadHolder: null,
    lrEvent: null,
    history: [],
    turnCue: state.turnCue + 1,
  };
}

function advanceOpening(state: GameState): GameState {
  const opening = state.opening!;
  const nextIndex = opening.index + 1;
  if (nextIndex >= opening.order.length) {
    return {
      ...state,
      phase: 'playing',
      opening: null,
      buildMode: null,
      currentPlayerSlot: state.players[0]?.slot ?? 0,
      round: 1,
      turnCue: state.turnCue + 1,
    };
  }
  return {
    ...state,
    opening: { ...opening, index: nextIndex, step: 'settlement', settlementVertexId: null },
    buildMode: 'settlement',
    currentPlayerSlot: opening.order[nextIndex],
    turnCue: state.turnCue + 1,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      // Names are in; the board appears and the players organise themselves (colours + turn order) before opening placement.
      return {
        ...state,
        phase: 'arrange',
        players: action.players,
        board: action.board,
        boardKind: action.boardKind,
        opening: null,
        setupReturn: null,
        currentPlayerSlot: action.players[0]?.slot ?? 0,
        round: 1,
        buildMode: null,
        manualScores: emptyManualScores(action.players),
        longestRoadHolder: null,
        lrEvent: null,
        history: [],
      };

    case 'SET_BOARD_STYLE':
      return { ...state, boardStyle: action.style };

    case 'SET_TABLE_THEME':
      return { ...state, tableTheme: action.theme };

    case 'BEGIN_OPENING':
      if (state.phase !== 'arrange') return state;
      return startOpening(state, state.board, state.boardKind, state.players);

    case 'SET_PLAYER_GEM': {
      const mine = state.players.find((p) => p.slot === action.slot);
      if (!mine || mine.gem === action.gem || !GEMS.some((g) => g.id === action.gem)) return state;
      // Picking a colour someone else holds swaps the two, so every pick is one tap.
      const holder = state.players.find((p) => p.gem === action.gem);
      return {
        ...state,
        players: state.players.map((p) => {
          if (p.slot === action.slot) return { ...p, gem: action.gem };
          if (holder && p.slot === holder.slot) return { ...p, gem: mine.gem };
          return p;
        }),
      };
    }

    case 'RESUME_SETUP':
      return { ...state, phase: state.setupReturn ?? 'playing', setupReturn: null, players: action.players };

    case 'SET_BUILD_MODE':
      if (state.phase !== 'playing') return state;
      return { ...state, buildMode: action.mode };

    case 'SET_CURRENT_PLAYER':
      if (state.phase !== 'playing') return state;
      return { ...state, currentPlayerSlot: action.slot };

    case 'NEXT_TURN': {
      if (state.phase !== 'playing' || state.players.length === 0) return state;
      const index = state.players.findIndex((p) => p.slot === state.currentPlayerSlot);
      const nextIndex = (index + 1) % state.players.length;
      return {
        ...state,
        currentPlayerSlot: state.players[nextIndex].slot,
        round: nextIndex === 0 ? state.round + 1 : state.round,
        buildMode: null,
        turnCue: state.turnCue + 1,
      };
    }

    case 'REORDER_PLAYERS': {
      const from = state.players.findIndex((p) => p.slot === action.slot);
      if (from < 0) return state;
      const to = Math.max(0, Math.min(state.players.length - 1, action.toIndex));
      if (from === to) return state;
      const players = [...state.players];
      const [moved] = players.splice(from, 1);
      players.splice(to, 0, moved);
      return { ...state, players };
    }

    case 'RENAME_PLAYER': {
      const name = action.name.trim().slice(0, MAX_NAME_LENGTH) || `Player ${action.slot + 1}`;
      return { ...state, players: state.players.map((p) => (p.slot === action.slot ? { ...p, name } : p)) };
    }

    case 'PLACE_BUILDING': {
      const slot = state.currentPlayerSlot;

      if (state.phase === 'opening') {
        const opening = state.opening!;
        if (opening.step !== 'settlement') return state;
        if (!canPlaceSettlement(state.board, action.vertexId, slot, true).valid) return state;
        const board = setBuilding(state.board, action.vertexId, { playerId: slot, type: 'settlement' });
        const next = withBoard({ ...state, history: pushHistory(state) }, board);
        return { ...next, opening: { ...opening, step: 'road', settlementVertexId: action.vertexId }, buildMode: 'road' };
      }

      if (state.phase !== 'playing') return state;
      let board: Board | null = null;
      if (state.buildMode === 'settlement' && canPlaceSettlement(state.board, action.vertexId, slot).valid) {
        board = setBuilding(state.board, action.vertexId, { playerId: slot, type: 'settlement' });
      } else if (state.buildMode === 'city' && canUpgradeToCity(state.board, action.vertexId, slot).valid) {
        board = setBuilding(state.board, action.vertexId, { playerId: slot, type: 'city' });
      }
      if (!board) return state;
      return withBoard({ ...state, history: pushHistory(state) }, board);
    }

    case 'PLACE_ROAD': {
      const slot = state.currentPlayerSlot;

      if (state.phase === 'opening') {
        const opening = state.opening!;
        if (opening.step !== 'road') return state;
        if (!canPlaceRoad(state.board, action.edgeId, slot, opening.settlementVertexId).valid) return state;
        const board = setRoad(state.board, action.edgeId, { playerId: slot });
        return advanceOpening(withBoard({ ...state, history: pushHistory(state) }, board));
      }

      if (state.phase !== 'playing' || state.buildMode !== 'road') return state;
      if (!canPlaceRoad(state.board, action.edgeId, slot).valid) return state;
      return withBoard({ ...state, history: pushHistory(state) }, setRoad(state.board, action.edgeId, { playerId: slot }));
    }

    case 'MOVE_ROBBER': {
      if (state.phase !== 'playing' || state.buildMode !== 'robber') return state;
      if (state.board.robberHexId === action.hexId) return state;
      return { ...state, history: pushHistory(state), board: { ...state.board, robberHexId: action.hexId } };
    }

    case 'ERASE_VERTEX': {
      if (state.phase !== 'playing' || !state.board.vertices.find((v) => v.id === action.vertexId)?.building) return state;
      return withBoard({ ...state, history: pushHistory(state) }, setBuilding(state.board, action.vertexId, null));
    }

    case 'ERASE_EDGE': {
      if (state.phase !== 'playing' || !state.board.edges.find((e) => e.id === action.edgeId)?.road) return state;
      return withBoard({ ...state, history: pushHistory(state) }, setRoad(state.board, action.edgeId, null));
    }

    case 'UNDO': {
      const last = state.history[state.history.length - 1];
      if (!last || state.phase === 'setup') return state;
      const opening = last.opening;
      return {
        ...state,
        board: last.board,
        phase: last.phase,
        opening,
        round: last.round,
        longestRoadHolder: last.longestRoadHolder,
        history: state.history.slice(0, -1),
        buildMode: opening ? openingBuildMode(opening) : state.phase === 'playing' ? state.buildMode : null,
        currentPlayerSlot: opening ? opening.order[opening.index] : state.currentPlayerSlot,
      };
    }

    case 'SHUFFLE_BOARD':
      if (state.players.length === 0) return state;
      if (state.phase === 'arrange') return { ...state, board: generateBoard(state.boardKind) };
      return startOpening(state, generateBoard(state.boardKind), state.boardKind, state.players);

    case 'NEW_GAME':
      return {
        ...createInitialState(),
        devCardLegend: state.devCardLegend,
        boardStyle: state.boardStyle,
        tableTheme: state.tableTheme,
        eventSeq: state.eventSeq,
        turnCue: state.turnCue,
      };

    case 'REOPEN_SETUP':
      if (state.phase === 'setup') return state;
      return { ...state, setupReturn: state.phase, phase: 'setup' };

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
