import type { CategoryPulse } from '@/lib/types';

type Tier = 'hot' | 'warm' | 'cool' | 'cold' | 'quiet';

const tierGradient: Record<Tier, string> = {
  hot: 'linear-gradient(90deg, #f97316, #dc2626)',
  warm: 'linear-gradient(90deg, #fbbf24, #f97316)',
  cool: 'linear-gradient(90deg, #60a5fa, #8b5cf6)',
  cold: 'linear-gradient(90deg, #94a3b8, #64748b)',
  quiet: '',
};

function pickTier(pill: number, maxPill: number): Tier {
  if (pill === 0) return 'quiet';
  const r = pill / Math.max(1, maxPill);
  if (r >= 0.7) return 'hot';
  if (r >= 0.4) return 'warm';
  if (r >= 0.15) return 'cool';
  return 'cold';
}

function formatAgo(iso: string | null): string | null {
  if (!iso) return null;
  const hours = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(1, ...data);
  const w = 84;
  const h = 28;
  const dx = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((v, i) => {
      const x = i * dx;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full h-full overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function CategoryPulseList({ items }: { items: CategoryPulse[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No category activity yet. Once chat is ingested, categories will show up here.
      </p>
    );
  }

  const maxPill = Math.max(0, ...items.map((i) => i.pill_count));

  // Stable display sort: hot rows first by pill_count desc, then quiet rows by total desc.
  const sorted = [...items].sort((a, b) => {
    if (a.pill_count !== b.pill_count) return b.pill_count - a.pill_count;
    return b.total - a.total;
  });

  // Chronic flag: lifetime total in top 3, but currently quiet (pill < 30% of peak heat).
  const lifetimeRank = new Map(
    [...items].sort((a, b) => b.total - a.total).map((c, i) => [c.category, i] as const),
  );

  return (
    <ul className="grid gap-2.5">
      {sorted.map((c) => {
        const tier = pickTier(c.pill_count, maxPill);
        const isQuiet = tier === 'quiet';
        const lifetimeIdx = lifetimeRank.get(c.category) ?? 99;
        const isChronic = lifetimeIdx < 3 && c.pill_count < maxPill * 0.3;
        const ago = formatAgo(c.last_ts);
        const subtitle = isQuiet
          ? 'quiet this week'
          : `${c.unique_senders_7d} resident${c.unique_senders_7d === 1 ? '' : 's'} speaking up${ago ? ` · ${ago}` : ''}`;
        const lifetimeBits = [
          `${c.total.toLocaleString('en-IN')} lifetime`,
          isChronic ? 'chronic' : null,
        ].filter(Boolean);
        const sparkColor = isQuiet ? '#cbd0d7' : c.color ?? '#94a3b8';
        const deltaColor = tier === 'hot' || tier === 'warm' ? 'text-destructive' : 'text-muted-foreground';

        return (
          <li
            key={c.category}
            className={
              'rounded-2xl border bg-card p-3.5 sm:p-4 grid items-center gap-3 sm:gap-4 ' +
              'grid-cols-[44px_1fr_auto] sm:grid-cols-[44px_1fr_84px_auto] ' +
              (isQuiet ? 'opacity-70' : '')
            }
          >
            <div className="size-11 rounded-xl bg-muted/40 flex items-center justify-center text-2xl shrink-0" aria-hidden>
              {c.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap leading-tight">
                <span className="font-semibold text-[15px]">{c.label}</span>
                <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                  · {lifetimeBits.join(' · ')}
                </span>
              </div>
              <div className={'text-xs text-muted-foreground mt-1 ' + (isQuiet ? 'italic' : '')}>{subtitle}</div>
            </div>
            <div className="hidden sm:block w-[84px] h-7">
              <Spark data={c.daily_counts} color={sparkColor} />
            </div>
            <div className="text-right flex flex-col items-end gap-1 shrink-0">
              {isQuiet ? (
                <span className="rounded-full text-[11px] px-2.5 py-1 font-bold bg-muted text-muted-foreground">—</span>
              ) : (
                <span
                  className="rounded-full text-[11px] px-2.5 py-1 font-bold text-white whitespace-nowrap"
                  style={{ background: tierGradient[tier] }}
                >
                  {c.pill_count} msg{c.pill_count === 1 ? '' : 's'}
                </span>
              )}
              <span className={'text-[11px] font-semibold tabular-nums ' + deltaColor}>
                +{c.last7} this wk
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
