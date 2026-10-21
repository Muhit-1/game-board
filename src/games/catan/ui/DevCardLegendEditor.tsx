import type { DevCardLegendRow } from '../types';
import { IconButton } from '../../../shared/components/IconButton';
import { Plus, Trash2 } from '../../../shared/icons';

interface DevCardLegendEditorProps {
  rows: DevCardLegendRow[];
  onChange: (rows: DevCardLegendRow[]) => void;
  /** Two-line rows (card + delete on top, meaning below) for narrow side panels where side-by-side inputs truncate the text. */
  stacked?: boolean;
  /** Bigger text and taller inputs, for the full-page setup screen. */
  large?: boolean;
}

/** Fully editable table mapping a standard playing-card deck's ranks to a Catan dev-card meaning. */
export function DevCardLegendEditor({ rows, onChange, stacked = false, large = false }: DevCardLegendEditorProps) {
  function updateRow(id: string, field: 'label' | 'meaning', value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    onChange([...rows, { id: `row-${Date.now()}`, label: '', meaning: '' }]);
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-2.5">
      {stacked &&
        rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1.5 rounded-lg border border-[var(--line)] p-2">
            <div className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) => updateRow(row.id, 'label', e.target.value)}
                placeholder="Card"
                className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-charred-oak px-2.5 py-1.5 text-[13.5px] font-semibold text-brass-soft placeholder:text-parchment-dim/70 outline-none focus:border-brass"
              />
              <IconButton title="Remove row" variant="danger" onClick={() => removeRow(row.id)}>
                <Trash2 size={15} />
              </IconButton>
            </div>
            <input
              value={row.meaning}
              onChange={(e) => updateRow(row.id, 'meaning', e.target.value)}
              placeholder="Meaning"
              className="w-full rounded-md border border-[var(--line)] bg-charred-oak px-2.5 py-1.5 text-[13.5px] text-parchment placeholder:text-parchment-dim/70 outline-none focus:border-brass"
            />
          </div>
        ))}
      {!stacked && rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            value={row.label}
            onChange={(e) => updateRow(row.id, 'label', e.target.value)}
            placeholder="Card"
            className={`w-[38%] min-w-0 rounded-md border border-[var(--line)] bg-charred-oak px-2.5 ${large ? 'py-2.5 text-[16px]' : 'py-2 text-[13.5px]'} text-parchment placeholder:text-parchment-dim/70 outline-none focus:border-brass`}
          />
          <input
            value={row.meaning}
            onChange={(e) => updateRow(row.id, 'meaning', e.target.value)}
            placeholder="Meaning"
            className={`min-w-0 flex-1 rounded-md border border-[var(--line)] bg-charred-oak px-2.5 ${large ? 'py-2.5 text-[16px]' : 'py-2 text-[13.5px]'} text-parchment placeholder:text-parchment-dim/70 outline-none focus:border-brass`}
          />
          <IconButton title="Remove row" variant="danger" onClick={() => removeRow(row.id)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--line)] py-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-brass-soft hover:border-brass hover:text-brass"
      >
        <Plus size={14} /> Add row
      </button>
    </div>
  );
}
