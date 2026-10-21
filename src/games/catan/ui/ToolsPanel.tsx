import type { Dispatch, ReactNode } from 'react';
import type { GameAction, GameState } from '../state';
import type { BuildMode } from '../types';
import { Home, Building2, Route, Skull, Eraser, Undo2 } from '../../../shared/icons';

export interface ToolDef {
  mode: Exclude<BuildMode, null>;
  label: string;
  shortLabel: string;
  key: string;
  icon: ReactNode;
}

export const TOOLS: ToolDef[] = [
  { mode: 'road', label: 'Road', shortLabel: 'Road', key: 'R', icon: <Route size={17} strokeWidth={1.8} /> },
  { mode: 'settlement', label: 'Settlement', shortLabel: 'Settle', key: 'S', icon: <Home size={17} strokeWidth={1.8} /> },
  { mode: 'city', label: 'City', shortLabel: 'City', key: 'C', icon: <Building2 size={17} strokeWidth={1.8} /> },
  { mode: 'robber', label: 'Robber', shortLabel: 'Robber', key: 'B', icon: <Skull size={17} strokeWidth={1.8} /> },
  { mode: 'erase', label: 'Erase', shortLabel: 'Erase', key: 'E', icon: <Eraser size={17} strokeWidth={1.8} /> },
];

/** The build tools, vertically stacked in the right margin. During opening placement the tool is chosen automatically. */
export function ToolsPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const locked = state.phase !== 'playing';
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-walnut p-1.5 shadow-deep">
      {TOOLS.map((tool) => {
        const active = state.buildMode === tool.mode;
        return (
          <button
            key={tool.mode}
            type="button"
            disabled={locked}
            onClick={() => dispatch({ type: 'SET_BUILD_MODE', mode: active ? null : tool.mode })}
            className={[
              'flex h-[42px] w-full items-center gap-3 rounded-lg border px-3 text-label font-bold uppercase tracking-caps transition-colors',
              active ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/40' : 'border-transparent text-parchment-dim hover:bg-walnut-2',
              locked && !active ? 'opacity-40' : '',
            ].join(' ')}
          >
            <span className={active ? 'text-brass-soft' : 'text-brass'}>{tool.icon}</span>
            {tool.label}
            <kbd className="ml-auto font-mono text-micro font-bold text-parchment-dim/80">{tool.key}</kbd>
          </button>
        );
      })}
      <div className="mx-1 my-1 h-px bg-[var(--line)]" />
      <button
        type="button"
        disabled={state.history.length === 0}
        onClick={() => dispatch({ type: 'UNDO' })}
        className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-transparent px-3 text-label font-bold uppercase tracking-caps text-parchment-dim transition-colors hover:bg-walnut-2 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <span className="text-brass">
          <Undo2 size={17} strokeWidth={1.8} />
        </span>
        Undo
        <kbd className="ml-auto font-mono text-micro font-bold text-parchment-dim/80">Z</kbd>
      </button>
    </div>
  );
}
