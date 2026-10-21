import { useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state';
import type { HarborType } from '../types';
import { CostsContent } from './CostsContent';
import { DevCardLegendEditor } from './DevCardLegendEditor';
import { HARBOR_LABELS, harborColor } from '../board/resourceColors';
import { BookOpen, Check, ChevronDown, ChevronUp, Pencil } from '../../../shared/icons';

type ReferenceTab = 'costs' | 'dev' | 'ports';

const TABS: { key: ReferenceTab; label: string }[] = [
  { key: 'costs', label: 'Costs' },
  { key: 'dev', label: 'Dev cards' },
  { key: 'ports', label: 'Ports' },
];

/** Which harbours exist on the current board (3–4 and 5–6 player boards differ). */
export function HarborsContent({ state }: { state: GameState }) {
  const counts = new Map<HarborType, number>();
  state.board.harbors.forEach((h) => counts.set(h.type, (counts.get(h.type) ?? 0) + 1));
  return (
    <div className="flex flex-col gap-2">
      {[...counts.entries()].map(([type, count]) => (
        <div key={type} className="flex items-center gap-2.5 text-small font-semibold text-parchment">
          <span className="h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: harborColor(type), background: 'rgb(var(--walnut-rgb))' }} />
          {HARBOR_LABELS[type]}
          {count > 1 && <span className="ml-auto font-mono text-label text-parchment-dim">× {count}</span>}
        </div>
      ))}
    </div>
  );
}

/** Read-only by default so the meanings are fully legible in a narrow panel; "Edit legend" switches to the stacked editor. */
function DevLegendContent({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {editing ? (
        <DevCardLegendEditor stacked rows={state.devCardLegend} onChange={(rows) => dispatch({ type: 'UPDATE_DEV_CARD_LEGEND', rows })} />
      ) : (
        <div className="flex flex-col">
          {state.devCardLegend.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(64px,34%)_1fr] items-baseline gap-3 border-b border-[var(--line)] py-2 last:border-0">
              <span className="font-mono text-label font-bold text-brass-soft">{row.label || '—'}</span>
              <span className="text-body font-semibold leading-snug text-parchment">{row.meaning || '—'}</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setEditing((e) => !e)}
        className="flex items-center justify-center gap-1.5 rounded-md border border-[var(--line)] py-1.5 text-label font-bold uppercase tracking-caps text-brass-soft hover:bg-walnut-2"
      >
        {editing ? (
          <>
            <Check size={13} /> Done
          </>
        ) : (
          <>
            <Pencil size={13} /> Edit legend
          </>
        )}
      </button>
    </div>
  );
}

export function ReferenceContent({ tab, state, dispatch }: { tab: ReferenceTab; state: GameState; dispatch: Dispatch<GameAction> }) {
  if (tab === 'costs') return <CostsContent />;
  if (tab === 'dev') return <DevLegendContent state={state} dispatch={dispatch} />;
  return <HarborsContent state={state} />;
}

export type { ReferenceTab };

/** Costs / dev-card legend / harbours in one tabbed panel, collapsed by default on short screens. */
export function ReferencePanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const [tab, setTab] = useState<ReferenceTab>('costs');
  const [collapsed, setCollapsed] = useState(() => window.innerHeight < 820);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-walnut shadow-deep">
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="flex w-full items-center justify-between px-3.5 py-3 text-left">
        <span className="flex items-center gap-2 text-label font-bold uppercase tracking-caps text-brass-soft">
          <BookOpen size={14} /> Reference
        </span>
        {collapsed ? <ChevronUp size={15} className="text-parchment-dim" /> : <ChevronDown size={15} className="text-parchment-dim" />}
      </button>
      {!collapsed && (
        <>
          <div className="flex gap-1 px-3 pb-2.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'flex-1 rounded-lg border py-1.5 text-label font-bold transition-colors',
                  tab === t.key ? 'border-brass bg-walnut-2 text-parchment' : 'border-[var(--line)] text-parchment-dim hover:bg-walnut-2',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="max-h-[min(38vh,340px)] overflow-y-auto px-3.5 pb-3.5 scrollbar-ironwood">
            <ReferenceContent tab={tab} state={state} dispatch={dispatch} />
          </div>
        </>
      )}
    </div>
  );
}
