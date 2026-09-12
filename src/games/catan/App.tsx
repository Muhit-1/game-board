import { useReducer } from 'react';
import { createInitialState, gameReducer } from './state';
import { SetupScreen } from './setup/SetupScreen';
import { BoardView } from './board/BoardView';
import { TopLeftWidget } from './ui/TopLeftWidget';
import { ScorePanel } from './ui/ScorePanel';
import { CostCheatSheet } from './ui/CostCheatSheet';
import { DevCardLegendPanel } from './ui/DevCardLegendPanel';
import { ResourcesHarborsLegend } from './ui/ResourcesHarborsLegend';
import { BoardActions } from './ui/BoardActions';

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);

  if (state.phase === 'setup') {
    return <SetupScreen state={state} dispatch={dispatch} />;
  }

  const currentPlayer = state.players.find((p) => p.slot === state.currentPlayerSlot);

  function handleVertexClick(vertexId: number) {
    if (state.buildMode === 'settlement' || state.buildMode === 'city') {
      dispatch({ type: 'PLACE_BUILDING', vertexId });
    } else if (state.buildMode === 'erase') {
      const vertex = state.board.vertices.find((v) => v.id === vertexId);
      if (vertex?.building) dispatch({ type: 'ERASE_VERTEX', vertexId });
    }
  }

  function handleEdgeClick(edgeId: number) {
    if (state.buildMode === 'road') {
      dispatch({ type: 'PLACE_ROAD', edgeId });
    } else if (state.buildMode === 'erase') {
      const edge = state.board.edges.find((e) => e.id === edgeId);
      if (edge?.road) dispatch({ type: 'ERASE_EDGE', edgeId });
    }
  }

  function handleHexClick(hexId: number) {
    if (state.buildMode === 'robber') dispatch({ type: 'MOVE_ROBBER', hexId });
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

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto">
            <TopLeftWidget state={state} dispatch={dispatch} />
          </div>
          <div className="pointer-events-auto">
            <ScorePanel state={state} dispatch={dispatch} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <BoardActions dispatch={dispatch} />
          <div className="pointer-events-auto">
            <ResourcesHarborsLegend board={state.board} />
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="pointer-events-auto">
            <CostCheatSheet />
          </div>
          <div className="pointer-events-auto">
            <DevCardLegendPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      </div>
    </div>
  );
}
