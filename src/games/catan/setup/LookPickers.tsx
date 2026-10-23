import type { BoardStyle } from '../types';

/** Tiny static pictures of each board style (three hexes), so the choice is visible without painting a whole board. */
function StyleThumb({ style }: { style: BoardStyle }) {
  const hex = (cx: number, cy: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${cx + 17 * Math.cos(a)},${cy + 17 * Math.sin(a)}`;
    }).join(' ');
    return pts;
  };
  if (style === 'tavern') {
    return (
      <svg viewBox="0 0 120 64" className="h-full w-full" aria-hidden="true">
        <rect width="120" height="64" rx="8" fill="#2b2016" />
        {[
          [40, 22, '#3f7d3a'],
          [70, 22, '#e0b23a'],
          [55, 46, '#c2652f'],
        ].map(([x, y, c]) => (
          <g key={`${x}-${y}`}>
            <polygon points={hex(x as number, y as number)} fill={c as string} stroke="#2b2016" strokeWidth={2} />
            <circle cx={x as number} cy={y as number} r={7} fill="#ede1c8" />
          </g>
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="thumb-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1fb6e8" />
          <stop offset="1" stopColor="#0766a8" />
        </linearGradient>
      </defs>
      <rect width="120" height="64" rx="8" fill="transparent" />
      <polygon points="14,32 34,4 86,4 106,32 86,60 34,60" fill="url(#thumb-sea)" stroke="#f4ebcf" strokeWidth={2.5} />
      {[
        [48, 25, '#4f9a35'],
        [72, 25, '#e6b93c'],
        [60, 44, '#d0723a'],
      ].map(([x, y, c]) => (
        <g key={`${x}-${y}`}>
          <polygon points={hex(x as number, y as number)} fill="#efdcae" stroke="#c8ad73" strokeWidth={1} />
          <polygon points={hex(x as number, y as number).split(' ').map((p) => { const [px, py] = p.split(',').map(Number); return `${(x as number) + (px - (x as number)) * 0.86},${(y as number) + (py - (y as number)) * 0.86}`; }).join(' ')} fill={c as string} />
          <circle cx={x as number} cy={y as number} r={6.5} fill="#f1e1b0" stroke="#a98543" strokeWidth={1} />
        </g>
      ))}
    </svg>
  );
}

const STYLES: { value: BoardStyle; name: string; note: string }[] = [
  { value: 'tavern', name: 'Tavern', note: 'Flat colours, the original look' },
  { value: 'classic', name: 'Classic', note: 'Illustrated tiles, sea and harbours' },
];

/** Board style cards (flat Tavern board or illustrated Classic board). */
export function BoardStylePicker({ value, onChange }: { value: BoardStyle; onChange: (style: BoardStyle) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Board style">
      {STYLES.map((s) => {
        const on = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.value)}
            className={[
              'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
              on ? 'border-brass bg-walnut-2 ring-1 ring-brass/60' : 'border-[var(--line)] bg-charred-oak/40 hover:bg-walnut-2',
            ].join(' ')}
          >
            <span className="h-14 w-[104px] shrink-0 overflow-hidden rounded-lg">
              <StyleThumb style={s.value} />
            </span>
            <span className="min-w-0">
              <span className="block text-md font-bold text-parchment">{s.name}</span>
              <span className="block text-label leading-snug text-parchment-dim">{s.note}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
