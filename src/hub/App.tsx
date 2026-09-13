import { GAMES_REGISTRY } from './games-registry';
import { GameHex } from './GameHex';
import { Github } from '../shared/icons';

const GITHUB_URL = 'https://github.com/Muhit-1/game-board';

export function App() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b border-[var(--hub-line)] px-8 py-6">
        <h1
          className="font-pop text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ color: '#c05a12', textShadow: '0 2px 0 rgba(192,90,18,.15)' }}
        >
          Game Board
        </h1>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-12">
        <div className="flex flex-wrap justify-center gap-8">
          {GAMES_REGISTRY.map((game) => (
            <GameHex key={game.id} game={game} />
          ))}
        </div>
      </main>

      <a
        href={GITHUB_URL}
        className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border border-[var(--hub-line)] bg-white/70 px-4 py-2.5 text-[12px] font-semibold text-[var(--hub-ink-dim)] shadow-[0_10px_24px_rgba(74,53,32,.12)] backdrop-blur-sm transition-colors hover:bg-white hover:text-[var(--hub-ink)]"
      >
        <Github size={16} strokeWidth={1.8} />
        GitHub Source
      </a>
    </div>
  );
}
