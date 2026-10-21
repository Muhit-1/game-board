import { GEMS } from '../theme/gems';
import { GemIcon } from './GemIcon';

interface GemPickerProps {
  value: string;
  /** Gem id → name of the player who currently holds it (so the tooltip can say a pick swaps colours). */
  holders: Record<string, string>;
  onPick: (gemId: string) => void;
}

/** One-tap colour choice. Tapping a colour someone else holds swaps the two players' colours. */
export function GemPicker({ value, holders, onPick }: GemPickerProps) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Player colour" onClick={(e) => e.stopPropagation()}>
      {GEMS.map((gem) => {
        const selected = gem.id === value;
        const holder = holders[gem.id];
        return (
          <button
            key={gem.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={selected ? gem.label : holder ? `${gem.label} — swap with ${holder}` : gem.label}
            onClick={() => onPick(gem.id)}
            className={[
              'flex h-[30px] w-[30px] items-center justify-center rounded-lg border transition-colors',
              selected ? 'border-brass bg-walnut-2 ring-1 ring-brass/60' : 'border-transparent hover:bg-walnut-2',
              !selected && holder ? 'opacity-55 hover:opacity-100' : '',
            ].join(' ')}
          >
            <GemIcon gem={gem} size={22} />
          </button>
        );
      })}
    </div>
  );
}
