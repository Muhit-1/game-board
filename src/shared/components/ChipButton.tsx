import type { ReactNode } from 'react';

interface ChipButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

/** The corner-widget chip/button language: brass icon, small-caps label, active = brass border glow. */
export function ChipButton({ children, icon, onClick, active = false, disabled = false, title }: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.05em] transition-colors',
        'shadow-[0_10px_24px_rgba(0,0,0,.4)] disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-brass bg-walnut-2 text-parchment ring-1 ring-brass/60'
          : 'border-[var(--line)] bg-walnut text-parchment hover:bg-walnut-2',
      ].join(' ')}
    >
      <span className={active ? 'text-brass-soft' : 'text-brass'}>{icon}</span>
      {children}
    </button>
  );
}
