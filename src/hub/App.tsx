import { GAMES_REGISTRY } from './games-registry';
import { Map } from '../shared/icons';

export function App() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-8 py-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-parchment sm:text-4xl">Game Board</h1>
        <span className="rounded-full border border-[var(--line)] px-3.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-parchment-dim">
          Companion boards for game night
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="flex flex-wrap justify-center gap-6">
          {GAMES_REGISTRY.map((game) => (
            <a
              key={game.id}
              href={game.path}
              className="group flex w-64 flex-col gap-4 rounded-2xl border border-[var(--line)] bg-walnut p-6 shadow-deep transition-transform hover:-translate-y-1 hover:bg-walnut-2"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--line)] bg-charred-oak">
                <Map size={26} className="text-brass-soft" strokeWidth={1.8} />
              </div>
              <div>
                <div className="font-display text-xl font-semibold text-parchment">{game.title}</div>
                <p className="mt-1.5 text-[13px] leading-snug text-parchment-dim">{game.description}</p>
              </div>
              <span className="mt-auto font-mono text-[11px] uppercase tracking-[0.08em] text-brass-soft group-hover:text-brass">
                Open board →
              </span>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
