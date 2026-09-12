import type { Board, HarborType } from '../types';
import { Panel } from '../../../shared/components/Panel';
import { RESOURCE_COLORS, RESOURCE_LABELS, HARBOR_LABELS, harborColor } from '../board/resourceColors';
import { Map as MapIcon, Anchor } from '../../../shared/icons';

export function ResourcesHarborsLegend({ board }: { board: Board }) {
  const harborCounts = new Map<HarborType, number>();
  board.harbors.forEach((h) => harborCounts.set(h.type, (harborCounts.get(h.type) ?? 0) + 1));

  return (
    <Panel title="Resources & Harbors" icon={<MapIcon size={13} />} defaultCollapsed>
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-parchment-dim">Resources</div>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(RESOURCE_LABELS) as (keyof typeof RESOURCE_LABELS)[]).map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: RESOURCE_COLORS[r] }} />
                <span className="text-[12px] text-parchment">{RESOURCE_LABELS[r]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-parchment-dim">
            <Anchor size={11} /> Harbors ({board.harbors.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {[...harborCounts.entries()].map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-parchment">
                  <span className="h-3 w-3 rounded-full border" style={{ borderColor: harborColor(type) }} />
                  {HARBOR_LABELS[type]}
                </span>
                <span className="font-mono text-[11px] text-parchment-dim">×{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
