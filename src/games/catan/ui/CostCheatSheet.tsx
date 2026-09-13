import { Panel } from '../../../shared/components/Panel';
import { RESOURCE_COLORS_DEEP } from '../board/resourceColors';
import { Coins, Route, Home, Building2, Layers } from '../../../shared/icons';

interface CostRow {
  label: string;
  icon: JSX.Element;
  costs: { resource: keyof typeof RESOURCE_COLORS_DEEP; count: number; label: string }[];
}

const COSTS: CostRow[] = [
  {
    label: 'Road',
    icon: <Route size={14} strokeWidth={1.8} />,
    costs: [
      { resource: 'forest', count: 1, label: 'Lumber' },
      { resource: 'hills', count: 1, label: 'Brick' },
    ],
  },
  {
    label: 'Settlement',
    icon: <Home size={14} strokeWidth={1.8} />,
    costs: [
      { resource: 'forest', count: 1, label: 'Lumber' },
      { resource: 'hills', count: 1, label: 'Brick' },
      { resource: 'pasture', count: 1, label: 'Wool' },
      { resource: 'fields', count: 1, label: 'Grain' },
    ],
  },
  {
    label: 'City',
    icon: <Building2 size={14} strokeWidth={1.8} />,
    costs: [
      { resource: 'fields', count: 2, label: 'Grain' },
      { resource: 'mountains', count: 3, label: 'Ore' },
    ],
  },
  {
    label: 'Dev Card',
    icon: <Layers size={14} strokeWidth={1.8} />,
    costs: [
      { resource: 'pasture', count: 1, label: 'Wool' },
      { resource: 'fields', count: 1, label: 'Grain' },
      { resource: 'mountains', count: 1, label: 'Ore' },
    ],
  },
];

/** The shared inner content, reused by the desktop corner panel and the mobile bottom sheet. */
export function CostsContent() {
  return (
    <div className="flex flex-col gap-3">
      {COSTS.map((row) => (
        <div
          key={row.label}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
        >
          <span className="flex items-center gap-2 text-[14.5px] font-semibold text-parchment">
            <span className="text-brass">{row.icon}</span>
            {row.label}
          </span>
          <span className="flex flex-wrap gap-2">
            {row.costs.map((c) => (
              <span
                key={c.label}
                title={c.label}
                className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[13px] font-bold text-white shadow-[inset_0_1px_2px_rgba(255,255,255,.25),0_2px_4px_rgba(0,0,0,.35)]"
                style={{ background: RESOURCE_COLORS_DEEP[c.resource] }}
              >
                {c.count}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CostCheatSheet() {
  return (
    <Panel title="Costs" icon={<Coins size={14} />} collapsible={false} width={300}>
      <CostsContent />
    </Panel>
  );
}
