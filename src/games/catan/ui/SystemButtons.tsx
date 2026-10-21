import type { ReactNode } from 'react';
import { Shuffle, RefreshCw, Users, Volume2, VolumeX } from '../../../shared/icons';

interface SystemButtonsProps {
  muted: boolean;
  onToggleSound: () => void;
  onShuffle: () => void;
  onNewGame: () => void;
  onOpenSetup: () => void;
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-[var(--line)] bg-walnut text-brass shadow-card transition-colors hover:bg-walnut-2"
    >
      {children}
    </button>
  );
}

/** Sound toggle plus the rarely used board actions, as a compact icon row. */
export function SystemButtons({ muted, onToggleSound, onShuffle, onNewGame, onOpenSetup }: SystemButtonsProps) {
  return (
    <div className="flex gap-2">
      <RoundButton label={muted ? 'Unmute sounds' : 'Mute sounds'} onClick={onToggleSound}>
        {muted ? <VolumeX size={17} strokeWidth={1.9} /> : <Volume2 size={17} strokeWidth={1.9} />}
      </RoundButton>
      <RoundButton label="Shuffle board (restarts opening placement)" onClick={onShuffle}>
        <Shuffle size={17} strokeWidth={1.9} />
      </RoundButton>
      <RoundButton label="Setup — rename players, dev-card legend" onClick={onOpenSetup}>
        <Users size={17} strokeWidth={1.9} />
      </RoundButton>
      <RoundButton label="New game" onClick={onNewGame}>
        <RefreshCw size={17} strokeWidth={1.9} />
      </RoundButton>
    </div>
  );
}
