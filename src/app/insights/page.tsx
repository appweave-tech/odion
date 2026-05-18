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
    <main className="p-5 grid gap-5 max-w-4xl mx-auto pb-12">
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">Odion · The Woods of East</p>
        <h1 className="text-2xl font-semibold">Community Insights</h1>
        <p className="text-sm text-muted-foreground">
          What the RWA WhatsApp group is talking about — auto-classified so we can act on patterns, not memory.
        </p>
        <div className="mt-1">
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

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Issues raising heat (last 7 days)</h2>
          <span className="text-xs text-muted-foreground">≥ 2 residents</span>
        </div>
        <LiveIssuesList items={live} />
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Category breakdown</h2>
          <span className="text-xs text-muted-foreground">All time</span>
        </div>
        <ul className="grid gap-2">
          {stats
            .filter((s) => s.total > 0)
            .sort((a, b) => b.total - a.total)
            .map((s) => (
              <li key={s.category} className="grid gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{s.emoji}</span>
                    <span className="font-medium">{s.label}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.total.toLocaleString('en-IN')}
                    {s.last7 > 0 && (
                      <span className="ml-2 text-foreground">+{s.last7} this week</span>
                    )}
                  </span>
                </div>
                <Bar pct={s.total / Math.max(1, stats[0]?.total ?? 1)} color={s.color ?? '#94a3b8'} />
              </li>
            ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Most active (last 30 days)</h2>
          <Calendar className="size-4 text-muted-foreground" />
        </div>
        <ul className="grid gap-1.5">
          {contributors.map((c) => (
            <li key={c.sender} className="flex items-center justify-between text-sm">
              <span className="truncate pr-3">{c.sender}</span>
              <span className="tabular-nums text-muted-foreground">{c.count}</span>
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
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={
          'text-2xl font-semibold tabular-nums mt-1 ' +
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
