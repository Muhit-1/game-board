import type { ReactNode } from 'react';
import { Shuffle, RefreshCw, Users } from '../../../shared/icons';

interface BoardActionsProps {
  onShuffle: () => void;
  onNewGame: () => void;
  onOpenSetup: () => void;
}

function IconAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line)] bg-walnut text-brass shadow-[0_10px_24px_rgba(0,0,0,.4)] transition-colors hover:bg-walnut-2"
      >
        {icon}
      </button>
      <span
        className="pointer-events-none absolute left-full top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--line)] bg-walnut px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-parchment opacity-0 shadow-deep transition-opacity duration-100 group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

/** Icon-only action rail, docked at the true vertical center of the left edge; labels reveal on hover. */
export function BoardActions({ onShuffle, onNewGame, onOpenSetup }: BoardActionsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <IconAction icon={<Shuffle size={17} strokeWidth={2} />} label="Shuffle Board" onClick={onShuffle} />
      <IconAction icon={<RefreshCw size={17} strokeWidth={2} />} label="New Game" onClick={onNewGame} />
      <IconAction icon={<Users size={17} strokeWidth={2} />} label="Setup" onClick={onOpenSetup} />
    </div>
  );
}
