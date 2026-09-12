interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A themed replacement for window.confirm(), used for destructive board actions. */
export function ConfirmDialog({ message, confirmLabel = 'Confirm', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-walnut p-6 shadow-deep">
        <p className="text-[13.5px] leading-relaxed text-parchment">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--line)] px-4 py-2 text-[12px] font-semibold text-parchment-dim hover:bg-walnut-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-brass bg-brass px-4 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-charred-oak"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
