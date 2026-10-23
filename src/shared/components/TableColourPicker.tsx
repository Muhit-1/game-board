import { TABLE_THEMES } from '../theme/tableThemes';
import type { TableThemeId } from '../theme/tableThemes';

/** Round table-colour swatches; the page background (and panel tones) follow the choice straight away. */
export function TableColourPicker({ value, onChange }: { value: TableThemeId; onChange: (theme: TableThemeId) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label="Table colour">
      {TABLE_THEMES.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={t.name}
            onClick={() => onChange(t.id)}
            className={['h-8 w-8 rounded-full border-2 transition-transform hover:scale-110', on ? 'border-white ring-2 ring-brass' : 'border-black/30'].join(' ')}
            style={{ background: t.hex }}
          />
        );
      })}
    </div>
  );
}
