import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from '../icons';

interface PanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  /** When false, the panel has no collapse toggle and its content is always visible. */
  collapsible?: boolean;
  className?: string;
  width?: number;
}

/** A small, independently collapsible corner-docked widget panel. */
export function Panel({ title, icon, children, defaultCollapsed = false, collapsible = true, className = '', width = 268 }: PanelProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);

  return (
    <div
      className={`rounded-[15px] border border-[var(--line)] bg-walnut shadow-deep pointer-events-auto ${className}`}
      style={{ width }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-brass-soft">
            {icon}
            {title}
          </span>
          {collapsed ? <ChevronDown size={15} className="text-parchment-dim" /> : <ChevronUp size={15} className="text-parchment-dim" />}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-brass-soft">
          {icon}
          {title}
        </div>
      )}
      {!collapsed && <div className="max-h-[52vh] overflow-y-auto scrollbar-ironwood px-4 pb-4">{children}</div>}
    </div>
  );
}
