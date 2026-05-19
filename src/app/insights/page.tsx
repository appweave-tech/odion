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
import { AlertOctagon, MessageCircle, Users, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        <h1 className="text-2xl font-semibold">Odion · Community Insights</h1>
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
    <main className="p-5 grid gap-6 max-w-4xl mx-auto pb-16">
      <header className="grid gap-1.5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Odion · The Woods of East
        </p>
        <h1 className="text-2xl font-semibold">Community Insights</h1>
        <p className="text-sm text-muted-foreground">
          What the RWA WhatsApp group is talking about — auto-classified so we can act on
          patterns, not memory.
        </p>
        <div className="mt-2">
          <FreshnessChip uploadedAt={last.uploaded_at} chatLastTs={last.chat_last_ts} />
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile
          icon={<AlertOctagon className="size-4" />}
          label="Live issues (7d)"
          value={liveIssueCount}
          accent="destructive"
        />
        <Tile
          icon={<MessageCircle className="size-4" />}
          label="Messages 7d"
          value={totalLast7}
        />
        <Tile
          icon={<MessageCircle className="size-4 rotate-180" />}
          label="Complaints 7d"
          value={complaintsLast7}
          accent="destructive"
        />
        <Tile
          icon={<Users className="size-4" />}
          label="Active senders"
          value={overall.unique_senders}
        />
      </section>

      <section className="grid gap-2.5">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 className="font-medium text-base">Community pulse</h2>
          <span className="text-xs text-muted-foreground shrink-0">7d heat · 30d trend</span>
        </div>
        <p className="text-xs text-muted-foreground px-1 -mt-1">
          Sorted by this week&apos;s heat. Sparkline shows daily messages over the last 30 days; lifetime
          total in grey. Quiet categories appear muted.
        </p>
        <CategoryPulseList items={pulse} />
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5 grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-base">Most active</h2>
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Calendar className="size-3.5" /> 30d
          </span>
        </div>
        <ul className="grid divide-y">
          {contributors.map((c) => (
            <li key={c.sender} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate">{c.sender}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">
                {c.count.toLocaleString('en-IN')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="text-center text-sm text-muted-foreground underline underline-offset-4"
      >
        ← Back to Odion
      </Link>
      <Footer />
    </main>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: 'destructive';
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={
          'text-xl sm:text-2xl font-semibold tabular-nums mt-1 ' +
          (accent === 'destructive' && value > 0 ? 'text-destructive' : '')
        }
      >
        {value.toLocaleString('en-IN')}
      </div>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(2, pct * 100))}%`, background: color }}
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-2 text-center text-xs text-muted-foreground">
      Built By{' '}
      <a className="underline" href="https://appweave.tech" target="_blank" rel="noreferrer">
        Appweave
      </a>{' '}
      · Classification Is Automated.
    </footer>
  );
}
