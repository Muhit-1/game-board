import { GEMS } from '../../../shared/theme/gems';
import { GemIcon } from '../../../shared/components/GemIcon';
import { Check } from '../../../shared/icons';

interface GemPickerProps {
  selected: string | null;
  takenByOthers: Set<string>;
  onSelect: (gemId: string | null) => void;
}

export function GemPicker({ selected, takenByOthers, onSelect }: GemPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {GEMS.map((gem) => {
        const taken = takenByOthers.has(gem.id) && selected !== gem.id;
        const isSelected = selected === gem.id;
        return (
          <button
            key={gem.id}
            type="button"
            disabled={taken}
            onClick={() => onSelect(isSelected ? null : gem.id)}
            title={gem.label}
            className={[
              'relative flex flex-col items-center gap-1 rounded-lg border px-2.5 py-2 transition-colors',
              taken ? 'cursor-not-allowed border-[var(--line)] opacity-30' : 'border-[var(--line)] hover:bg-walnut-2',
              isSelected ? 'border-brass bg-walnut-2 ring-1 ring-brass/60' : 'bg-charred-oak',
            ].join(' ')}
          >
            {isSelected && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-charred-oak">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
            <GemIcon gem={gem} size={30} />
            <span className="text-[9.5px] font-semibold text-parchment-dim">{gem.label}</span>
          </button>
        );
      })}
    </div>
  );
}
