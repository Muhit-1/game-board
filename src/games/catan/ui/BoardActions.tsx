import type { Dispatch } from 'react';
import type { GameAction } from '../state';
import { ChipButton } from '../../../shared/components/ChipButton';
import { Shuffle, RefreshCw, Users } from '../../../shared/icons';

export function BoardActions({ dispatch }: { dispatch: Dispatch<GameAction> }) {
  function handleShuffle() {
    if (window.confirm('Shuffle the board? This clears all buildings, roads, the robber position, and scores.')) {
      dispatch({ type: 'SHUFFLE_BOARD' });
    }
  }

  function handleNewGame() {
    if (window.confirm('Start a new game? This clears the board, the player roster, and all scores.')) {
      dispatch({ type: 'NEW_GAME' });
    }
  }

  return (
    <div className="pointer-events-auto flex flex-col gap-2.5">
      <ChipButton icon={<Shuffle size={15} strokeWidth={2} />} onClick={handleShuffle}>
        Shuffle Board
      </ChipButton>
      <ChipButton icon={<RefreshCw size={15} strokeWidth={2} />} onClick={handleNewGame}>
        New Game
      </ChipButton>
      <ChipButton icon={<Users size={15} strokeWidth={2} />} onClick={() => dispatch({ type: 'REOPEN_SETUP' })}>
        Setup
      </ChipButton>
    </div>
  );
}
