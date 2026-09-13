import type { GameEntry } from './games-registry';

const WIDTH = 240;
const HEIGHT = 276;
const CENTER: [number, number] = [WIDTH / 2, HEIGHT / 2];
const OUTER_RADIUS = 118;
const CORNER_RADIUS = 22;

function hexPoints(cx: number, cy: number, r: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
  });
}

/** A polygon outline with each corner replaced by a short rounded arc, via quadratic curves. */
function roundedPolygonPath(points: [number, number][], radius: number): string {
  const n = points.length;
  const sub = (a: [number, number], b: [number, number]): [number, number] => [a[0] - b[0], a[1] - b[1]];
  const norm = (v: [number, number]): [number, number] => {
    const len = Math.hypot(v[0], v[1]);
    return [v[0] / len, v[1] / len];
  };

  let d = '';
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const toPrev = norm(sub(prev, curr));
    const toNext = norm(sub(next, curr));
    const before: [number, number] = [curr[0] + toPrev[0] * radius, curr[1] + toPrev[1] * radius];
    const after: [number, number] = [curr[0] + toNext[0] * radius, curr[1] + toNext[1] * radius];
    d += i === 0 ? `M ${before[0]} ${before[1]} ` : `L ${before[0]} ${before[1]} `;
    d += `Q ${curr[0]} ${curr[1]} ${after[0]} ${after[1]} `;
  }
  return d + 'Z';
}

const HEX_PATH = roundedPolygonPath(hexPoints(CENTER[0], CENTER[1], OUTER_RADIUS), CORNER_RADIUS);

/**
 * The hub tile for one game: a simple, clear hexagon (softly rounded corners) in a warm
 * gradient orange — deliberately its own accent color against the hub's light cream page.
 * Idle state shows just the hex; hovering reveals the game's name and description.
 */
export function GameHex({ game }: { game: GameEntry }) {
  return (
    <a
      href={game.path}
      className="group relative block outline-none transition-transform duration-200 hover:scale-[1.03]"
      style={{ width: WIDTH, height: HEIGHT, filter: 'drop-shadow(0 16px 30px rgba(120,58,10,.35))' }}
    >
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <linearGradient id={`hexOrange-${game.id}`} x1="15%" y1="8%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#ffc27a" />
            <stop offset="45%" stopColor="#f2883a" />
            <stop offset="100%" stopColor="#c05a12" />
          </linearGradient>
          <clipPath id={`hexClip-${game.id}`}>
            <path d={HEX_PATH} />
          </clipPath>
        </defs>
        <path d={HEX_PATH} fill={`url(#hexOrange-${game.id})`} stroke="#a9490a" strokeWidth={3} />
        <g clipPath={`url(#hexClip-${game.id})`}>
          <ellipse cx={CENTER[0] - 30} cy={CENTER[1] - 75} rx={110} ry={65} fill="#fff" opacity={0.25} />
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="font-display text-2xl font-semibold text-white [text-shadow:0_2px_10px_rgba(90,40,0,.55)]">{game.title}</div>
        <p className="text-[12.5px] leading-snug text-white/95 [text-shadow:0_1px_6px_rgba(90,40,0,.5)]">{game.description}</p>
      </div>
    </a>
  );
}
