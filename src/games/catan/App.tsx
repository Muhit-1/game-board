import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createInitialState, gameReducer } from './state';
import { canPlaceRoad, canPlaceSettlement, canUpgradeToCity } from './rules';
import { computeScores } from './scoring/computeScores';
import type { LongestRoadEvent } from './types';
import { SetupScreen } from './setup/SetupScreen';
import { BoardView } from './board/BoardView';
import { ArrangeCard, PlayerList, TurnCard } from './ui/PlayersPanel';
import { TOOLS, ToolsPanel } from './ui/ToolsPanel';
import { ReferencePanel } from './ui/ReferencePanel';
import { SystemButtons } from './ui/SystemButtons';
import { MobileControls } from './ui/MobileControls';
import { AwardPopup, PlayerChip, TurnBanner } from './ui/Popups';
import { Toast } from '../../shared/components/Toast';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { getGem } from '../../shared/theme/gems';
import { isMuted, playSound, setMuted } from '../../shared/sound/sounds';
import { tableThemeStyle } from '../../shared/theme/tableThemes';
import { saveLook } from './prefs';
import { Route, Trophy } from '../../shared/icons';

interface ConfirmState {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

type AwardState = { id: number } & ({ kind: 'longest'; event: LongestRoadEvent } | { kind: 'win'; slot: number });

const WINNING_SCORE = 10;

export function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [banner, setBanner] = useState<{ id: number; name: string; gemId: string | null; kicker: string; durationMs?: number } | null>(null);
  const [award, setAward] = useState<AwardState | null>(null);
  const noticeTimeout = useRef<number | null>(null);
  const lastLongestRoadEvent = useRef(0);
  const awardSeq = useRef(0);
  const bannerSeq = useRef(0);
  const announcedWinners = useRef(new Set<number>());

  const scores = useMemo(
    () =>
      computeScores(
        state.board,
        state.players.map((p) => p.slot),
        state.manualScores,
        state.longestRoadHolder,
      ),
    [state.board, state.players, state.manualScores, state.longestRoadHolder],
  );

  const opening = state.phase === 'opening';
  const openingVertexId = opening ? state.opening?.settlementVertexId ?? null : null;

  /** Spots the active tool can legally use — only these glow on the board. */
  const legal = useMemo(() => {
    const vertices = new Set<number>();
    const edges = new Set<number>();
    if (state.phase === 'setup') return { vertices, edges };
    const { board, buildMode, currentPlayerSlot: slot } = state;
    if (buildMode === 'settlement') {
      board.vertices.forEach((v) => canPlaceSettlement(board, v.id, slot, opening).valid && vertices.add(v.id));
    } else if (buildMode === 'city') {
      board.vertices.forEach((v) => canUpgradeToCity(board, v.id, slot).valid && vertices.add(v.id));
    } else if (buildMode === 'road') {
      board.edges.forEach((e) => canPlaceRoad(board, e.id, slot, openingVertexId).valid && edges.add(e.id));
    } else if (buildMode === 'erase') {
      board.vertices.forEach((v) => v.building && vertices.add(v.id));
      board.edges.forEach((e) => e.road && edges.add(e.id));
    }
    return { vertices, edges };
  }, [state.board, state.buildMode, state.currentPlayerSlot, state.phase, opening, openingVertexId]);

  function showNotice(message: string) {
    setNotice(message);
    playSound('error');
    if (noticeTimeout.current) window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(null), 2800);
  }

  function showAward(payload: { kind: 'longest'; event: LongestRoadEvent } | { kind: 'win'; slot: number }) {
    awardSeq.current += 1;
    setAward({ id: awardSeq.current, ...payload });
  }

  // Turn passed to someone new: soft banner + ting.
  useEffect(() => {
    if (state.turnCue === 0 || state.phase === 'setup') return;
    const player = state.players.find((p) => p.slot === state.currentPlayerSlot);
    if (!player) return;
    bannerSeq.current += 1;
    setBanner({ id: bannerSeq.current, name: player.name, gemId: player.gem, kicker: state.phase === 'opening' ? 'Opening placement' : 'Now playing' });
    playSound('turn');
  }, [state.turnCue]);

  // Right after Start: tell the table to organise themselves before any pieces go down.
  useEffect(() => {
    if (state.phase !== 'arrange') return;
    bannerSeq.current += 1;
    setBanner({ id: bannerSeq.current, name: 'Organize your players', gemId: null, kicker: 'Before we start', durationMs: 3600 });
    playSound('turn');
  }, [state.phase === 'arrange']);

  // Longest Road gained / changed hands / lost.
  useEffect(() => {
    const event = state.lrEvent;
    if (!event || event.id === lastLongestRoadEvent.current) return;
    lastLongestRoadEvent.current = event.id;
    showAward({ kind: 'longest', event });
    playSound(event.kind === 'lost' ? 'lost' : 'longest');
  }, [state.lrEvent]);

  // Someone reaches 10 points (shown once per crossing; the game doesn't force an end).
  useEffect(() => {
    if (state.phase !== 'playing') return;
    state.players.forEach((p) => {
      if ((scores[p.slot]?.total ?? 0) >= WINNING_SCORE) {
        if (!announcedWinners.current.has(p.slot)) {
          announcedWinners.current.add(p.slot);
          showAward({ kind: 'win', slot: p.slot });
          playSound('win');
        }
      } else {
        announcedWinners.current.delete(p.slot);
      }
    });
  }, [scores, state.phase]);

  // Remember the look (board style + table colour) across refreshes.
  useEffect(() => {
    saveLook({ boardStyle: state.boardStyle, tableTheme: state.tableTheme });
  }, [state.boardStyle, state.tableTheme]);

  // Keyboard shortcuts: tool letters, N = next turn, Z = undo, Esc = put the tool down.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (confirmState || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') {
          e.preventDefault();
          dispatch({ type: 'UNDO' });
        }
        return;
      }
      if (key === 'z') return void dispatch({ type: 'UNDO' });
      if (state.phase !== 'playing') return;
      if (key === 'n') return void dispatch({ type: 'NEXT_TURN' });
      if (key === 'escape') return void dispatch({ type: 'SET_BUILD_MODE', mode: null });
      const tool = TOOLS.find((t) => t.key.toLowerCase() === key);
      if (tool) dispatch({ type: 'SET_BUILD_MODE', mode: state.buildMode === tool.mode ? null : tool.mode });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.buildMode, confirmState]);

  if (state.phase === 'setup') {
    return <SetupScreen state={state} dispatch={dispatch} />;
  }

  const currentPlayer = state.players.find((p) => p.slot === state.currentPlayerSlot);
  const currentGem = currentPlayer ? getGem(currentPlayer.gem) : undefined;

  function handleVertexClick(vertexId: number) {
    const slot = state.currentPlayerSlot;
    if (state.buildMode === 'settlement') {
      const result = canPlaceSettlement(state.board, vertexId, slot, opening);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_BUILDING', vertexId });
      playSound('settlement');
    } else if (state.buildMode === 'city') {
      const result = canUpgradeToCity(state.board, vertexId, slot);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_BUILDING', vertexId });
      playSound('city');
    } else if (state.buildMode === 'erase') {
      const vertex = state.board.vertices.find((v) => v.id === vertexId);
      if (vertex?.building) {
        dispatch({ type: 'ERASE_VERTEX', vertexId });
        playSound('erase');
      }
    }
  }

  function handleEdgeClick(edgeId: number) {
    if (state.buildMode === 'road') {
      const result = canPlaceRoad(state.board, edgeId, state.currentPlayerSlot, openingVertexId);
      if (!result.valid) return showNotice(result.reason!);
      dispatch({ type: 'PLACE_ROAD', edgeId });
      playSound('road');
    } else if (state.buildMode === 'erase') {
      const edge = state.board.edges.find((e) => e.id === edgeId);
      if (edge?.road) {
        dispatch({ type: 'ERASE_EDGE', edgeId });
        playSound('erase');
      }
    }
  }

  function handleHexClick(hexId: number) {
    if (state.buildMode !== 'robber' || state.board.robberHexId === hexId) return;
    dispatch({ type: 'MOVE_ROBBER', hexId });
    playSound('robber');
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playSound('turn');
  }

  function requestShuffle() {
    setConfirmState({
      message: 'Shuffle the board? This clears all buildings, roads, the robber position and scores, and restarts opening placement.',
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

  function renderAward(a: AwardState): ReactNode {
    const dismiss = () => setAward(null);
    if (a.kind === 'win') {
      const winner = state.players.find((p) => p.slot === a.slot);
      const gem = winner && getGem(winner.gem);
      if (!winner || !gem) return null;
      return (
        <AwardPopup
          id={a.id}
          icon={<Trophy size={26} strokeWidth={2} />}
          kicker="Victory points"
          title="10 points!"
          who={<PlayerChip gem={gem} name={winner.name} />}
          sub="You decide when the game ends — keep playing or call it."
          onClose={dismiss}
        />
      );
    }

    const { event } = a;
    const holder = state.players.find((p) => p.slot === event.slot);
    const previous = state.players.find((p) => p.slot === event.previousSlot);
    const holderGem = holder && getGem(holder.gem);
    const previousGem = previous && getGem(previous.gem);
    const icon = <Route size={26} strokeWidth={2} />;

    if (event.kind === 'lost' && previous && previousGem) {
      return (
        <AwardPopup
          id={a.id}
          icon={icon}
          kicker="Up for grabs"
          title="Longest Road"
          tone="dim"
          who={<PlayerChip gem={previousGem} name={`${previous.name} loses it`} dim />}
          sub="Nobody holds it now — it takes 5 connected roads, and a tie keeps it with the current holder."
          onClose={dismiss}
        />
      );
    }
    if (event.kind === 'steal' && holder && holderGem && previous && previousGem) {
      return (
        <AwardPopup
          id={a.id}
          icon={icon}
          kicker="Changes hands"
          title="Longest Road"
          who={
            <span className="flex flex-wrap items-center justify-center gap-2">
              <PlayerChip gem={previousGem} name={previous.name} dim />
              <span className="text-parchment-dim">→</span>
              <PlayerChip gem={holderGem} name={holder.name} />
            </span>
          }
          sub={
            <>
              {holder.name} has <b className="text-brass-soft">{event.length} roads</b>, passing {previous.name} · +2 / −2 points
            </>
          }
          onClose={dismiss}
        />
      );
    }
    if (event.kind === 'gain' && holder && holderGem) {
      return (
        <AwardPopup
          id={a.id}
          icon={icon}
          kicker="New record"
          title="Longest Road"
          who={<PlayerChip gem={holderGem} name={holder.name} />}
          sub={
            <>
              <b className="text-brass-soft">{event.length} connected roads</b> · +2 points
            </>
          }
          onClose={dismiss}
        />
      );
    }
    return null;
  }

  const bannerGem = banner?.gemId ? getGem(banner.gemId) : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden" style={tableThemeStyle(state.tableTheme)}>
      {/* Own compositor layer: board repaints don't drag the panels along, and panel hovers don't repaint the board. */}
      <div className="absolute inset-0 transform-gpu">
        <BoardView
          board={state.board}
          players={state.players}
          buildMode={state.buildMode}
          currentPlayerGem={currentPlayer?.gem ?? null}
          style={state.boardStyle}
          legalVertexIds={legal.vertices}
          legalEdgeIds={legal.edges}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={handleHexClick}
        />
      </div>

      {/* Whose turn it is, readable from across the table: the screen edge glows in the current player's gem colour. */}
      <div
        className="pointer-events-none fixed inset-0 z-[9] transform-gpu transition-[box-shadow] duration-500"
        style={{
          boxShadow: currentGem && state.phase !== 'arrange' ? `inset 0 0 0 5px ${currentGem.glow}, inset 0 0 90px ${currentGem.glow}55` : undefined,
        }}
      />

      {/* Desktop: the board keeps the full screen; every panel sits in the left/right margins it can't use anyway. */}
      <div className="pointer-events-none fixed bottom-4 left-4 top-4 z-10 hidden w-[clamp(240px,16vw,300px)] flex-col min-[1100px]:flex">
        <div className="pointer-events-auto -mx-1 flex min-h-0 flex-col overflow-y-auto px-1 pb-1 pt-1 scrollbar-ironwood">
          <div className="mb-2.5 shrink-0">
            {state.phase === 'arrange' ? <ArrangeCard dispatch={dispatch} /> : <TurnCard state={state} dispatch={dispatch} />}
          </div>
          <PlayerList state={state} dispatch={dispatch} scores={scores} variant="floating" />
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 top-4 z-10 hidden w-[clamp(264px,19vw,360px)] flex-col items-end justify-between min-[1100px]:flex">
        <div className="pointer-events-auto flex w-full flex-col items-end gap-2.5">
          <SystemButtons muted={muted} onToggleSound={toggleSound} onShuffle={requestShuffle} onNewGame={requestNewGame} onOpenSetup={() => dispatch({ type: 'REOPEN_SETUP' })} />
          <div className="w-full">
            <ToolsPanel state={state} dispatch={dispatch} />
          </div>
        </div>
        <div className="pointer-events-auto w-full">
          <ReferencePanel state={state} dispatch={dispatch} />
        </div>
      </div>

      <MobileControls
        state={state}
        dispatch={dispatch}
        scores={scores}
        muted={muted}
        onToggleSound={toggleSound}
        onShuffle={requestShuffle}
        onNewGame={requestNewGame}
        onOpenSetup={() => dispatch({ type: 'REOPEN_SETUP' })}
      />

      <Toast message={notice} />
      {banner && <TurnBanner id={banner.id} kicker={banner.kicker} name={banner.name} gem={bannerGem} durationMs={banner.durationMs} onDone={() => setBanner(null)} />}
      {award && renderAward(award)}
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
