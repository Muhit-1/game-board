import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { GemDef } from '../theme/gems';
import { GemIcon } from './GemIcon';
import { Users } from '../icons';

const AWARD_DURATION_MS = 3800;
const BANNER_DURATION_MS = 1900;

export function PlayerChip({ gem, name, dim = false }: { gem: GemDef; name: string; dim?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-charred-oak/60 py-1.5 pl-2 pr-4 text-md font-bold ${dim ? 'text-parchment-dim opacity-70' : 'text-parchment'}`}
    >
      <GemIcon gem={gem} size={26} />
      {name}
    </span>
  );
}

interface AwardPopupProps {
  /** Changes for every new popup so the animation and the auto-close timer restart. */
  id: number;
  icon: ReactNode;
  kicker: string;
  title: string;
  who: ReactNode;
  sub: ReactNode;
  tone?: 'gold' | 'dim';
  onClose: () => void;
}

/** A centred celebration card (Longest Road, reaching 10 points). The backdrop ignores clicks so the board stays usable. */
export function AwardPopup({ id, icon, kicker, title, who, sub, tone = 'gold', onClose }: AwardPopupProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, AWARD_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [id]);

  const gold = tone === 'gold';
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        key={id}
        role="status"
        onClick={onClose}
        className={[
          'award-card pointer-events-auto relative w-[340px] max-w-full cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-b from-walnut-2 to-walnut px-6 pb-7 pt-6 text-center shadow-deep',
          gold ? 'border-brass' : 'border-parchment/30',
        ].join(' ')}
      >
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-charred-oak shadow-card"
          style={{
            background: gold
              ? 'radial-gradient(circle at 35% 30%, #f4d9a3, #c9903f 60%, #7a5420)'
              : 'radial-gradient(circle at 35% 30%, #d8cbae, #8a8f97 60%, #4b5058)',
          }}
        >
          {icon}
        </div>
        <div className="text-label font-bold uppercase tracking-kicker text-brass-soft">{kicker}</div>
        <div className="mb-3 mt-1 font-display text-[28px] font-semibold text-parchment">{title}</div>
        <div className="flex justify-center">{who}</div>
        <div className="mt-3 text-small leading-snug text-parchment-dim">{sub}</div>
        <div
          className={`award-drain absolute bottom-0 left-0 h-1 w-full ${gold ? 'bg-brass' : 'bg-parchment-dim'}`}
          style={{ animationDuration: `${AWARD_DURATION_MS}ms` }}
        />
      </div>
    </div>
  );
}

interface TurnBannerProps {
  id: number;
  kicker: string;
  name: string;
  /** Omit for announcements that aren't about one player (e.g. "Organize your players"). */
  gem?: GemDef;
  durationMs?: number;
  onDone: () => void;
}

/** A brief banner shown when the turn passes (or a phase starts); fades by itself and never blocks the board. */
export function TurnBanner({ id, kicker, name, gem, durationMs = BANNER_DURATION_MS, onDone }: TurnBannerProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(timer);
  }, [id]);

  const color = gem?.glow ?? 'var(--brass)';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center">
      <div
        key={id}
        className="turn-banner flex items-center gap-3.5 rounded-full border-2 bg-charred-oak/95 py-3 pl-4 pr-8"
        style={{ borderColor: color, boxShadow: 'var(--shadow-deep)', animationDuration: `${durationMs}ms` }}
      >
        {gem ? (
          <GemIcon gem={gem} size={44} />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brass text-charred-oak">
            <Users size={22} strokeWidth={2} />
          </span>
        )}
        <div>
          <div className="text-label font-bold uppercase tracking-kicker text-brass-soft">{kicker}</div>
          <div className="font-display text-[30px] font-semibold leading-tight text-parchment">{name}</div>
        </div>
      </div>
    </div>
  );
}
