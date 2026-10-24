import type { GameState } from '../state';
import { getGem } from '../../../shared/theme/gems';
import { GemIcon } from '../../../shared/components/GemIcon';
import { Eye, Trophy } from '../../../shared/icons';

interface WinDialogProps {
  state: GameState;
  onNewGame: () => void;
  onUndo: () => void;
  onLookAtMap: () => void;
}

const REASONS = {
  caught: (who: string | null) => `${who ?? 'A detective'} landed on Mr. X. He is caught!`,
  trapped: () => 'Mr. X had nowhere left to go.',
  escaped: () => 'Mr. X survived all 24 rounds and slips away.',
  stuck: () => 'No detective can move any more, so Mr. X is safe.',
} as const;

/** The end of the game: who won and where Mr. X really was. */
export function WinDialog({ state, onNewGame, onUndo, onLookAtMap }: WinDialogProps) {
  const winner = state.winner;
  if (!winner) return null;
  const by = winner.by !== null ? state.players.find((p) => p.slot === winner.by) : undefined;
  const mrX = state.players.find((p) => p.role === 'mrx');
  const gem = getGem((winner.side === 'mrx' ? mrX?.gem : by?.gem) ?? 'ruby');
  const detectivesWin = winner.side === 'detectives';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-2xl border border-brass bg-gradient-to-b from-walnut-2 to-walnut p-7 text-center shadow-deep">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brass text-charred-oak">
          <Trophy size={30} strokeWidth={2} />
        </div>
        <div className="text-micro font-bold uppercase tracking-kicker text-brass-soft">Game over</div>
        <div className="mb-3 mt-1 font-display text-[32px] font-semibold leading-tight text-parchment">{detectivesWin ? 'The detectives win!' : 'Mr. X gets away!'}</div>
        <div className="mb-3 flex justify-center">{gem && <GemIcon gem={gem} size={44} />}</div>
        <p className="text-md leading-snug text-parchment-dim">{REASONS[winner.reason](by?.name ?? null)}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button type="button" onClick={onNewGame} className="rounded-xl border border-brass bg-brass py-3 text-body font-bold uppercase tracking-caps text-charred-oak hover:bg-brass-soft">
            New game
          </button>
          <button type="button" onClick={onLookAtMap} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] py-2.5 text-small font-bold uppercase tracking-caps text-parchment hover:bg-walnut-2">
            <Eye size={15} /> Look at the map
          </button>
          <button type="button" onClick={onUndo} className="text-small font-semibold text-parchment-dim underline-offset-4 hover:underline">
            Undo the last move
          </button>
        </div>
      </div>
    </div>
  );
}
