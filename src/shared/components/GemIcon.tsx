import { useId } from 'react';
import type { GemCut, GemDef } from '../theme/gems';

function octagonPoints(cx: number, cy: number, r: number): string {
  const cut = r * 0.42;
  const box: [number, number][] = [
    [cx - r, cy - r + cut],
    [cx - r + cut, cy - r],
    [cx + r - cut, cy - r],
    [cx + r, cy - r + cut],
    [cx + r, cy + r - cut],
    [cx + r - cut, cy + r],
    [cx - r + cut, cy + r],
    [cx - r, cy + r - cut],
  ];
  return box.map((p) => p.join(',')).join(' ');
}

function FacetOverlay({ cut, cx, cy, r }: { cut: GemCut; cx: number; cy: number; r: number }) {
  if (cut === 'brilliant') {
    const lines = Array.from({ length: 6 }, (_, i) => {
      const angle = ((Math.PI * 2) / 6) * i - Math.PI / 2;
      return {
        x2: cx + Math.cos(angle) * r * 0.92,
        y2: cy + Math.sin(angle) * r * 0.92,
      };
    });
    return (
      <g opacity={0.55}>
        {lines.map((l, i) => (
          <line key={i} x1={cx} y1={cy} x2={l.x2} y2={l.y2} stroke="#fff" strokeWidth={1} opacity={0.35} />
        ))}
        <circle cx={cx - r * 0.28} cy={cy - r * 0.32} r={r * 0.16} fill="#fff" opacity={0.55} />
      </g>
    );
  }
  if (cut === 'emerald') {
    const lines = [-2, -1, 0, 1, 2].map((i) => cy + i * r * 0.28);
    return (
      <g opacity={0.55}>
        {lines.map((y, i) => (
          <line key={i} x1={cx - r * 0.85} y1={y} x2={cx + r * 0.85} y2={y} stroke="#fff" strokeWidth={0.8} opacity={0.28} />
        ))}
        <rect x={cx - r * 0.55} y={cy - r * 0.7} width={r * 0.35} height={r * 0.3} fill="#fff" opacity={0.4} rx={2} />
      </g>
    );
  }
  return (
    <g opacity={0.55}>
      <ellipse cx={cx - r * 0.2} cy={cy - r * 0.28} rx={r * 0.42} ry={r * 0.26} fill="#fff" opacity={0.45} />
      <ellipse cx={cx + r * 0.28} cy={cy + r * 0.3} rx={r * 0.22} ry={r * 0.14} fill="#000" opacity={0.18} />
    </g>
  );
}

export function GemIcon({ gem, size = 32 }: { gem: GemDef; size?: number }) {
  const uid = useId();
  const gradId = `gem-grad-${gem.id}-${uid}`;
  const r = 22;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={gem.c1} />
          <stop offset="55%" stopColor={gem.c2} />
          <stop offset="100%" stopColor={gem.c3} />
        </radialGradient>
      </defs>
      <polygon points={octagonPoints(28, 28, r)} fill={`url(#${gradId})`} stroke="rgba(0,0,0,.35)" strokeWidth={1} />
      <FacetOverlay cut={gem.cut} cx={28} cy={28} r={r} />
    </svg>
  );
}
