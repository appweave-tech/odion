import Link from 'next/link';
import {
  getCategoryStats,
  getLastIngest,
  getLiveIssues,
  getOverallStats,
  getTopContributors,
} from '@/lib/actions/insights';
import { FreshnessChip } from './_freshness';
import { LiveIssuesList } from './_live';
import { AlertOctagon, MessageCircle, Users, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InsightsPage() {
  const [last, overall, stats, live, contributors] = await Promise.all([
    getLastIngest(),
    getOverallStats(),
    getCategoryStats(),
    getLiveIssues(),
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
          value={live.length}
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

      <section className="rounded-2xl border bg-card p-4 sm:p-5 grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-base">Issues raising heat</h2>
          <span className="text-xs text-muted-foreground shrink-0">7d · ≥ 2 residents</span>
        </div>
        <LiveIssuesList items={live} />
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5 grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-base">Category breakdown</h2>
          <span className="text-xs text-muted-foreground shrink-0">All time</span>
        </div>
        <ul className="grid gap-3">
          {stats
            .filter((s) => s.total > 0)
            .sort((a, b) => b.total - a.total)
            .map((s) => (
              <li key={s.category} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span aria-hidden>{s.emoji}</span>
                    <span className="font-medium truncate">{s.label}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {s.total.toLocaleString('en-IN')}
                    {s.last7 > 0 && (
                      <span className="ml-2 text-foreground">+{s.last7}</span>
                    )}
                  </span>
                </div>
                <Bar pct={s.total / Math.max(1, stats[0]?.total ?? 1)} color={s.color ?? '#94a3b8'} />
              </li>
            ))}
        </ul>
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
