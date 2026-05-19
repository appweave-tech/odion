import { listSkipsLastNDays } from '@/lib/actions/skip';
import { SkipBarChart } from '@/components/SkipBarChart';
import { SkipsByDate } from '@/components/SkipsByDate';

// ISR: re-render at most once every 60s. Heatmap aggregates last 30 days of
// skips; 60s stale is fine for the resident scan and slashes TTFB by skipping
// the postgres round-trip on hot views.
export const revalidate = 60;

export default async function HistoryPage() {
  const skips = await listSkipsLastNDays(30);

  const byDate: Record<string, number> = {};
  for (const s of skips) {
    const k = String(s.skip_date);
    byDate[k] = (byDate[k] ?? 0) + 1;
  }

  return (
    <div className="p-5 grid gap-5">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">History</div>
        <h1 className="text-2xl font-semibold">Skips · last 30 days</h1>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <SkipBarChart byDate={byDate} days={30} />
      </section>

      <SkipsByDate skips={skips} days={30} />
    </div>
  );
}
