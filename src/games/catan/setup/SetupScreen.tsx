import { useMemo, useState } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { GameAction, GameState } from '../state';
import { MAX_NAME_LENGTH } from '../state';
import { DevCardLegendEditor } from '../ui/DevCardLegendEditor';
import { BoardView } from '../board/BoardView';
import { generateBoard } from '../board/generateBoard';
import { boardKindForPlayers, describeBoard, MAX_PLAYERS, MIN_PLAYERS } from '../board/boardConfig';
import { gemForSlot } from '../../../shared/theme/gems';
import { BoardStylePicker, TableColourPicker } from './LookPickers';
import { tableThemeStyle } from '../../../shared/theme/tableThemes';
import { Shuffle, Users } from '../../../shared/icons';

interface SetupScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);
const NO_SPOTS = new Set<number>();
const NOOP = () => undefined;

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3.5 text-[15px] font-bold uppercase tracking-[0.08em] text-brass-soft">{children}</div>;
}

/** Names screen. Colours and turn order are chosen next, on the board. Laid out wide so everything fits one screen without scrolling. */
export function SetupScreen({ state, dispatch }: SetupScreenProps) {
  // Reopened mid-game: names and the dev-card legend can change, but the player count (and so the board) is fixed.
  const isResume = state.players.length > 0;
  const [playerCount, setPlayerCount] = useState(state.players.length || 4);
  const [names, setNames] = useState<string[]>(() => Array.from({ length: MAX_PLAYERS }, (_, i) => state.players.find((p) => p.slot === i)?.name ?? ''));
  const boardKind = boardKindForPlayers(playerCount);
  const [previewSeed, setPreviewSeed] = useState(0);
  // The board shown here is the board that starts the game, so what you see is what you get.
  const previewBoard = useMemo(() => generateBoard(boardKind), [boardKind, previewSeed]);

  const cleanName = (slot: number) => names[slot].trim().slice(0, MAX_NAME_LENGTH) || `Player ${slot + 1}`;

  function setName(index: number, value: string) {
    setNames((current) => current.map((n, i) => (i === index ? value : n)));
  }

  function handleStart() {
    if (isResume) {
      // Keep the current turn order and colours; only the names come from this screen.
      dispatch({ type: 'RESUME_SETUP', players: state.players.map((p) => ({ ...p, name: cleanName(p.slot) })) });
    } else {
      const players = Array.from({ length: playerCount }, (_, slot) => ({ slot, gem: gemForSlot(slot).id, name: cleanName(slot) }));
      dispatch({ type: 'START_GAME', players, board: previewBoard, boardKind });
    }
  }

  const shownSlots = isResume ? state.players.map((p) => p.slot) : Array.from({ length: playerCount }, (_, i) => i);
  const panel = 'flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-walnut p-6 shadow-deep sm:p-7';

  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:h-screen lg:overflow-hidden lg:px-16 lg:py-10" style={tableThemeStyle(state.tableTheme)}>
      <header className="mb-6 flex items-center gap-4">
        <Users size={32} className="text-brass" strokeWidth={1.8} />
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-[color:var(--on-table)]">Catan — Setup</h1>
          <p className="mt-0.5 text-[17px] text-[color:var(--on-table-dim)]">
            {isResume ? 'Rename players or edit the dev-card legend.' : 'Pick the player count and type everyone’s name — colours and turn order come next, on the board.'}
          </p>
        </div>
      </header>

      <div
        className={[
          'grid min-h-0 flex-1 gap-6',
          isResume
            ? 'lg:grid-cols-[minmax(320px,420px)_minmax(360px,560px)_minmax(320px,440px)] lg:justify-center'
            : 'lg:grid-cols-[minmax(270px,1fr)_minmax(340px,1.4fr)_minmax(0,1.8fr)]',
        ].join(' ')}
      >
        <section className={panel}>
          {!isResume && (
            <div className="mb-7">
              <SectionTitle>Players</SectionTitle>
              <div className="flex gap-3">
                {PLAYER_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    className={[
                      'flex h-16 w-16 items-center justify-center rounded-xl border font-display text-3xl font-semibold transition-colors',
                      playerCount === count
                        ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/60'
                        : 'border-[var(--line)] bg-charred-oak text-parchment-dim hover:bg-walnut-2',
                    ].join(' ')}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-ironwood">
            <SectionTitle>Names</SectionTitle>
            <div className="flex flex-col gap-3">
              {shownSlots.map((slot) => (
                <label key={slot} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-charred-oak text-[14px] font-bold text-parchment-dim">
                    {slot + 1}
                  </span>
                  <input
                    value={names[slot]}
                    onChange={(e) => setName(slot, e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder={`Player ${slot + 1}`}
                    aria-label={`Player ${slot + 1} name`}
                    className="min-w-0 flex-1 rounded-[10px] border border-[var(--line)] bg-charred-oak px-3.5 py-3 text-[17.5px] font-semibold text-parchment outline-none placeholder:text-parchment-dim/50 focus:border-brass"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={panel}>
          <SectionTitle>Development card legend</SectionTitle>
          <p className="-mt-1 mb-4 text-[15px] leading-snug text-parchment-dim">Which playing card stands for which dev card — edit it to match your house rules.</p>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-ironwood">
            <DevCardLegendEditor large rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
          </div>
        </section>

        {isResume && (
          <section className={panel}>
            <SectionTitle>Board style</SectionTitle>
            <div className="mb-7">
              <BoardStylePicker value={state.boardStyle} onChange={(style) => dispatch({ type: 'SET_BOARD_STYLE', style })} />
            </div>
            <SectionTitle>Table colour</SectionTitle>
            <TableColourPicker value={state.tableTheme} onChange={(theme) => dispatch({ type: 'SET_TABLE_THEME', theme })} />
          </section>
        )}

        {!isResume && (
          <section className={`${panel} min-h-[340px]`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-parchment">
                  {playerCount} players · {boardKind === 'extended' ? '5–6 player extension board' : 'standard board'}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-parchment-dim">
                  {describeBoard(boardKind)} Each player has 5 settlements, 4 cities and 15 roads. First to 10 points wins.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSeed((s) => s + 1)}
                title="Shuffle the preview board"
                className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-[13.5px] font-bold uppercase tracking-[0.04em] text-parchment-dim hover:bg-walnut-2"
              >
                <Shuffle size={16} className="text-brass" /> Shuffle
              </button>
            </div>
            <div className="mt-4">
              <BoardStylePicker value={state.boardStyle} onChange={(style) => dispatch({ type: 'SET_BOARD_STYLE', style })} />
            </div>
            <div className="mt-3 min-h-[300px] flex-1 lg:min-h-0">
              <BoardView
                board={previewBoard}
                players={[]}
                buildMode={null}
                currentPlayerGem={null}
                style={state.boardStyle}
                legalVertexIds={NO_SPOTS}
                legalEdgeIds={NO_SPOTS}
                onVertexClick={NOOP}
                onEdgeClick={NOOP}
                onHexClick={NOOP}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="text-[14px] font-bold uppercase tracking-[0.08em] text-brass-soft">Table colour</span>
              <TableColourPicker value={state.tableTheme} onChange={(theme) => dispatch({ type: 'SET_TABLE_THEME', theme })} />
            </div>
          </section>
        )}
      </div>

      <footer className="mt-6 flex justify-end gap-3">
        {isResume && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESUME_SETUP', players: state.players })}
            className="rounded-lg border border-[var(--line)] px-6 py-3 text-[16px] font-semibold text-parchment-dim hover:bg-walnut-2"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleStart}
          className="rounded-lg border border-brass bg-brass px-10 py-3.5 text-[16px] font-bold uppercase tracking-[0.05em] text-charred-oak hover:bg-brass-soft"
        >
          {isResume ? 'Save & Resume' : 'Start Game'}
        </button>
      </footer>
    </div>
  );
}
