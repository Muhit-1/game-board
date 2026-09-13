import { useReducer, useRef, useState } from 'react';
import { createInitialState, gameReducer } from './state';
import { canPlaceRoad, canPlaceSettlement, canUpgradeToCity } from './rules';
import { SetupScreen } from './setup/SetupScreen';
import { BoardView } from './board/BoardView';
import { TopLeftWidget } from './ui/TopLeftWidget';
import { ScorePanel } from './ui/ScorePanel';
import { CostCheatSheet } from './ui/CostCheatSheet';
import { DevCardLegendPanel } from './ui/DevCardLegendPanel';
import { BoardActions } from './ui/BoardActions';
import { MobileControls } from './ui/MobileControls';
import { Toast } from '../../shared/components/Toast';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

interface ConfirmState {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const noticeTimeout = useRef<number | null>(null);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimeout.current) window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 2800);
  }

  if (state.phase === 'setup') {
    return <SetupScreen state={state} dispatch={dispatch} />;
  }

  const currentPlayer = state.players.find((p) => p.slot === state.currentPlayerSlot);

  function handleVertexClick(vertexId: number) {
    if (state.buildMode === 'settlement') {
      const result = canPlaceSettlement(state.board, vertexId, state.currentPlayerSlot);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_BUILDING', vertexId });
    } else if (state.buildMode === 'city') {
      const result = canUpgradeToCity(state.board, vertexId, state.currentPlayerSlot);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_BUILDING', vertexId });
    } else if (state.buildMode === 'erase') {
      const vertex = state.board.vertices.find((v) => v.id === vertexId);
      if (vertex?.building) dispatch({ type: 'ERASE_VERTEX', vertexId });
    }
  }

  function handleEdgeClick(edgeId: number) {
    if (state.buildMode === 'road') {
      const result = canPlaceRoad(state.board, edgeId, state.currentPlayerSlot);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_ROAD', edgeId });
    } else if (state.buildMode === 'erase') {
      const edge = state.board.edges.find((e) => e.id === edgeId);
      if (edge?.road) dispatch({ type: 'ERASE_EDGE', edgeId });
    }
  }

  function handleHexClick(hexId: number) {
    if (state.buildMode === 'robber') dispatch({ type: 'MOVE_ROBBER', hexId });
  }

  function requestShuffle() {
    setConfirmState({
      message: 'Shuffle the board? This clears all buildings, roads, the robber position, and scores.',
      confirmLabel: 'Shuffle',
      onConfirm: () => {
        dispatch({ type: 'SHUFFLE_BOARD' });
        setConfirmState(null);
      },
    });
  }

  function requestNewGame() {
    setConfirmState({
      message: 'Start a new game? This clears the board, the player roster, and all scores.',
      confirmLabel: 'New Game',
      onConfirm: () => {
        dispatch({ type: 'NEW_GAME' });
        setConfirmState(null);
      },
    });
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <BoardView
          board={state.board}
          players={state.players}
          buildMode={state.buildMode}
          currentPlayerGem={currentPlayer?.gem ?? null}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={handleHexClick}
        />
      </div>

      {/* Desktop: floating corner panels. Hidden below md — there isn't room for two ~280px columns
          plus the board on a phone screen, so mobile gets its own bottom-nav + sheet UI instead. */}
      <div className="pointer-events-none fixed inset-0 z-10 hidden justify-between gap-3 p-4 md:flex">
        {/* Left column: its own top/middle/bottom stack, entirely independent of the right column */}
        <div className="flex flex-col items-start justify-between">
          <div className="pointer-events-auto">
            <TopLeftWidget state={state} dispatch={dispatch} />
          </div>
          <div className="pointer-events-auto">
            <BoardActions onShuffle={requestShuffle} onNewGame={requestNewGame} onOpenSetup={() => dispatch({ type: 'REOPEN_SETUP' })} />
          </div>
          <div className="pointer-events-auto">
            <CostCheatSheet />
          </div>
        </div>

        {/* Right column: its own top/middle/bottom stack — expanding one never moves the left column */}
        <div className="flex flex-col items-end justify-between">
          <div className="pointer-events-auto">
            <ScorePanel state={state} dispatch={dispatch} />
          </div>
          <div className="pointer-events-auto">
            <DevCardLegendPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      </div>

      <MobileControls state={state} dispatch={dispatch} onShuffle={requestShuffle} onNewGame={requestNewGame} onOpenSetup={() => dispatch({ type: 'REOPEN_SETUP' })} />

      <Toast message={notice} />
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
