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
  /** When false, content is never height-capped or internally scrolled — it just takes the space it needs. */
  scrollable?: boolean;
  className?: string;
  width?: number;
}

/** A small, independently collapsible corner-docked widget panel. */
export function Panel({
  title,
  icon,
  children,
  defaultCollapsed = false,
  collapsible = true,
  scrollable = true,
  className = '',
  width = 268,
}: PanelProps) {
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
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-brass-soft">
            {icon}
            {title}
          </span>
          {collapsed ? <ChevronDown size={16} className="text-parchment-dim" /> : <ChevronUp size={16} className="text-parchment-dim" />}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3.5 text-[12.5px] font-bold uppercase tracking-[0.08em] text-brass-soft">
          {icon}
          {title}
        </div>
      )}
      {!collapsed && (
        <div
          className={`px-4 pb-4 ${scrollable ? 'max-h-[52vh] overflow-y-auto overflow-x-hidden scrollbar-ironwood' : 'overflow-visible'}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
