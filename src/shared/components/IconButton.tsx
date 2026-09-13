import type { ReactNode } from 'react';

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  title: string;
  variant?: 'default' | 'danger';
}

/** Small icon-only control, used for add/edit/delete rows on the dev-card legend. */
export function IconButton({ children, onClick, title, variant = 'default' }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] transition-colors',
        variant === 'danger' ? 'text-ember hover:bg-ember/15' : 'text-brass-soft hover:bg-walnut-2',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
