import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import { MAX_NAME_LENGTH } from '../state';
import type { Player } from '../types';
import { PLAYER_COUNT } from '../data/graph';
import { MapView } from '../board/MapView';
import { TableColourPicker } from '../../../shared/components/TableColourPicker';
import { tableThemeStyle } from '../../../shared/theme/tableThemes';
import { Shuffle, Users } from '../../../shared/icons';

interface SetupScreenProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const NO_TARGETS = new Map<number, never[]>();
const NOOP = () => undefined;
/** Default colours: Mr. X is onyx, the detectives take the rest in order. */
const DETECTIVE_GEMS = ['ruby', 'sapphire', 'amethyst', 'aquamarine', 'rosequartz'];

function SectionTitle({ children }: { children: string }) {
  return <div className="mb-3.5 text-md font-bold uppercase tracking-caps text-brass-soft">{children}</div>;
}

/** Six names and who is Mr. X. Colours and the detectives' order come next, on the map. */
export function SetupScreen({ state, dispatch }: SetupScreenProps) {
  const [names, setNames] = useState<string[]>(() => Array.from({ length: PLAYER_COUNT }, () => ''));
  const [mrXSlot, setMrXSlot] = useState(0);

  const cleanName = (slot: number) => names[slot].trim().slice(0, MAX_NAME_LENGTH) || `Player ${slot + 1}`;

  function start() {
    let detective = 0;
    const players: Player[] = names.map((_, slot) => {
      const isMrX = slot === mrXSlot;
      return { slot, name: cleanName(slot), role: isMrX ? 'mrx' : 'detective', gem: isMrX ? 'onyx' : DETECTIVE_GEMS[detective++] };
    });
    dispatch({ type: 'START_GAME', players });
  }

  return (
    <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8 lg:h-screen lg:overflow-hidden lg:px-16 lg:py-10" style={tableThemeStyle(state.tableTheme)}>
      <header className="mb-6 flex items-center gap-4">
        <Users size={32} className="text-brass" strokeWidth={1.8} />
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-[color:var(--on-table)]">Scotland Yard — Setup</h1>
          <p className="mt-0.5 text-lead text-[color:var(--on-table-dim)]">Six players: one Mr. X and five detectives. Type the names and choose who is Mr. X — colours and turn order come next, on the map.</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(340px,1fr)_minmax(0,2fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-walnut p-6 shadow-deep sm:p-7">
          <SectionTitle>Players</SectionTitle>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-ironwood">
            <div className="flex flex-col gap-3">
              {names.map((name, slot) => (
                <div key={slot} className="flex items-center gap-3">
                  <input
                    value={name}
                    onChange={(e) => setNames((current) => current.map((n, i) => (i === slot ? e.target.value : n)))}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder={`Player ${slot + 1}`}
                    aria-label={`Player ${slot + 1} name`}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-charred-oak px-3.5 py-3 text-lead font-semibold text-parchment outline-none placeholder:text-parchment-dim/50 focus:border-brass"
                  />
                  <button
                    type="button"
                    onClick={() => setMrXSlot(slot)}
                    aria-pressed={mrXSlot === slot}
                    className={[
                      'w-[104px] shrink-0 rounded-lg border px-2 py-2.5 text-label font-bold uppercase tracking-caps transition-colors',
                      mrXSlot === slot ? 'border-[#666] bg-black text-white' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
                    ].join(' ')}
                  >
                    {mrXSlot === slot ? 'Mr. X' : 'Detective'}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMrXSlot(Math.floor(Math.random() * PLAYER_COUNT))}
              className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-label font-bold uppercase tracking-caps text-parchment hover:bg-walnut-2"
            >
              <Shuffle size={14} className="text-brass" /> Pick Mr. X at random
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-5">
            <span className="text-body font-bold uppercase tracking-caps text-brass-soft">Table colour</span>
            <TableColourPicker value={state.tableTheme} onChange={(theme) => dispatch({ type: 'SET_TABLE_THEME', theme })} />
          </div>
        </section>

        <section className="flex min-h-[320px] min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-walnut p-6 shadow-deep sm:p-7">
          <h2 className="font-display text-2xl font-semibold text-parchment">The map</h2>
          <p className="mb-3 mt-1 text-md leading-relaxed text-parchment-dim">
            199 stations. Taxi roads are yellow, bus lines teal, the underground red and dashed, the ferry dashed black. The detectives' start stations are drawn at random once you press Start. Mr. X plays on paper.
          </p>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl" style={{ background: tableThemeStyle(state.tableTheme).background }}>
            <MapView pawns={[]} lastSeen={null} targets={NO_TARGETS} picking={false} onStationClick={NOOP} />
          </div>
        </section>
      </div>

      <footer className="mt-6 flex justify-end">
        <button type="button" onClick={start} className="rounded-lg border border-brass bg-brass px-10 py-3.5 text-md font-bold uppercase tracking-caps text-charred-oak hover:bg-brass-soft">
          Start game
        </button>
      </footer>
    </div>
  );
}
