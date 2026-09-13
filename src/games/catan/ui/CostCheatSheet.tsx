import { Panel } from '../../../shared/components/Panel';
import { RESOURCE_COLORS } from '../board/resourceColors';
import { Coins, Route, Home, Building2, Layers } from '../../../shared/icons';

interface CostRow {
  label: string;
  icon: JSX.Element;
  costs: { resource: keyof typeof RESOURCE_COLORS; count: number; label: string }[];
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

export function CostCheatSheet() {
  return (
    <Panel title="Costs" icon={<Coins size={14} />} collapsible={false} width={300}>
      <div className="flex flex-col gap-2.5">
        {COSTS.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-[var(--line)] pb-2.5 last:border-0 last:pb-0"
          >
            <span className="flex items-center gap-2 text-[14.5px] font-semibold text-parchment">
              <span className="text-brass">{row.icon}</span>
              {row.label}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {row.costs.map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-charred-oak/50 px-2 py-1">
                  <span className="h-3 w-3 rounded-sm" style={{ background: RESOURCE_COLORS[c.resource] }} />
                  <span className="font-mono text-[13px] font-semibold text-parchment">{c.count}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
