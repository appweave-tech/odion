import Link from 'next/link';
import {
  getCategoryPulse,
  getCategoryStats,
  getLastIngest,
  getOverallStats,
  getTopContributors,
} from '@/lib/actions/insights';
import { FreshnessChip } from './_freshness';
import { CategoryPulseList } from './_pulse';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Avatar palette for contributor circles — same pastel set as _pulse heat tiers.
const AVATAR_COLORS = ['#a78bfa', '#fb7185', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#fb923c', '#94a3b8'];

export default async function InsightsPage() {
  const [last, overall, stats, pulse, contributors] = await Promise.all([
    getLastIngest(),
    getOverallStats(),
    getCategoryStats(),
    getCategoryPulse(),
    getTopContributors(8),
  ]);

  if (!last) {
    return (
      <main className="p-5 grid gap-4">
        <h1 className="font-display text-3xl font-bold">Odion · Community Insights</h1>
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
          No chat ingested yet. Check back soon.
        </div>
        <Footer />
      </main>
    );
  }

  const totalLast7 = stats.reduce((s, c) => s + c.last7, 0);
  const complaintsLast7 = stats.reduce((s, c) => s + c.complaints7, 0);
  const liveIssueCount = pulse.filter((c) => c.pill_count > 0).length;

  return (
    <main className="px-4 sm:px-5 pt-6 pb-16 grid gap-5 max-w-2xl mx-auto">
      <section className="rounded-3xl border bg-card p-6 sm:p-7 grid gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide">
          <span className="rounded-full bg-violet-100 text-violet-700 px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
            Pulse
          </span>
          <span>Odion · The Woods of East</span>
        </div>
        <h1 className="font-display font-bold text-[34px] leading-[1.08] tracking-tight">
          What&apos;s the neighborhood <em className="not-italic text-violet-600 font-display italic">buzzing</em> about?
        </h1>
        <p className="text-sm text-muted-foreground">
          Auto-classified from the RWA WhatsApp group — so we can act on patterns, not memory.
        </p>
        <div className="mt-1">
          <FreshnessChip uploadedAt={last.uploaded_at} chatLastTs={last.chat_last_ts} />
        </div>
      </section>

      <section className="-mx-4 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2.5 px-4 sm:px-0 sm:grid sm:grid-cols-4">
          <Chip emoji="🚨" value={liveIssueCount} label="live issues" alert />
          <Chip emoji="💬" value={totalLast7} label="messages · 7d" />
          <Chip emoji="📣" value={complaintsLast7} label="complaints · 7d" alert />
          <Chip emoji="👥" value={overall.unique_senders} label="active voices" />
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="font-display font-bold text-2xl tracking-tight">Community pulse</h2>
          <span className="text-[11px] text-muted-foreground shrink-0">7d heat · 30d trend</span>
        </div>
        <p className="text-xs text-muted-foreground px-1 -mt-1">
          Sorted by this week&apos;s heat. Sparkline shows daily messages over the last 30 days; lifetime
          total in grey. Quiet categories appear muted.
        </p>
        <CategoryPulseList items={pulse} />
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="font-display font-bold text-2xl tracking-tight">Loudest voices</h2>
          <span className="text-[11px] text-muted-foreground shrink-0">30d</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {contributors.map((c, i) => {
            const initial = (c.sender.match(/\p{L}/u)?.[0] ?? c.sender.slice(0, 1) ?? '?').toUpperCase();
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <li
                key={c.sender}
                className="rounded-2xl border bg-card px-3 py-2.5 flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: color }}
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{c.sender}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {c.count.toLocaleString('en-IN')} messages
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        href="/"
        className="text-center text-sm text-muted-foreground underline underline-offset-4 mt-2"
      >
        ← Back to Odion
      </Link>
      <Footer />
    </main>
  );
}

function Chip({
  emoji,
  value,
  label,
  alert,
}: {
  emoji: string;
  value: number;
  label: string;
  alert?: boolean;
}) {
  return (
    <div
      className={
        'rounded-2xl border bg-card px-4 py-3 flex items-center gap-3 shrink-0 min-w-[150px] sm:min-w-0 ' +
        (alert && value > 0 ? 'border-rose-200' : '')
      }
    >
      <span className="text-[22px] leading-none" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0">
        <div
          className={
            'font-bold text-lg tabular-nums leading-tight ' +
            (alert && value > 0 ? 'text-destructive' : '')
          }
        >
          {value.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-2 text-center text-xs text-muted-foreground italic">
      made with care by{' '}
      <a className="underline not-italic" href="https://appweave.tech" target="_blank" rel="noreferrer">
        Appweave
      </a>{' '}
      · the robots do the classifying
    </footer>
  );
}
