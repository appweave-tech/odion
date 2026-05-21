import { listSkipsLastNDays } from '@/lib/actions/skip';
import { SkipBarChart } from '@/components/SkipBarChart';
import { SkipsByDate } from '@/components/SkipsByDate';
import { HistorySummary } from '@/components/HistorySummary';
import { WeeklyAggregate } from '@/components/WeeklyAggregate';
import { daysAgoIST } from '@/lib/utils';

// ISR: re-render at most once every 60s. Heatmap aggregates last 30 days of
// skips; 60s stale is fine for the resident scan and slashes TTFB by skipping
// the postgres round-trip on hot views.
export const revalidate = 60;

const DAYS = 30;
const WEEKS = 4;

export default async function HistoryPage() {
  const skips = await listSkipsLastNDays(DAYS);

  const byDate: Record<string, number> = {};
  for (const s of skips) {
    const k = String(s.skip_date);
    byDate[k] = (byDate[k] ?? 0) + 1;
  }

  // Headline numbers — total skips, days that had any skip, peak day.
  const total = skips.length;
  const dayCount = Object.keys(byDate).length;
  let peakCount = 0;
  let peakDate: string | null = null;
  for (const [d, n] of Object.entries(byDate)) {
    if (n > peakCount) {
      peakCount = n;
      peakDate = d;
    }
  }

  // Weekly buckets, oldest first so the strip reads left → right as time
  // moves forward toward "This week" on the right.
  const weekLabels = ['3 wks ago', '2 wks ago', 'Last week', 'This week'];
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const weekIndex = WEEKS - 1 - i; // 0 = this week, 3 = three weeks ago
    const start = daysAgoIST(weekIndex * 7 + 6);
    const end = daysAgoIST(weekIndex * 7);
    let count = 0;
    for (const [d, n] of Object.entries(byDate)) {
      if (d >= start && d <= end) count += n;
    }
    return { label: weekLabels[i], count };
  });

  return (
    <div className="p-5 grid gap-5">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">History</div>
        <h1 className="text-2xl font-semibold">Skips · last {DAYS} days</h1>
      </header>

      <HistorySummary
        total={total}
        dayCount={dayCount}
        peakCount={peakCount}
        peakDate={peakDate}
      />

      <section className="rounded-2xl border bg-card p-4">
        <SkipBarChart byDate={byDate} days={DAYS} />
      </section>

      {total > 0 && <WeeklyAggregate weeks={weeks} />}

      <SkipsByDate skips={skips} days={DAYS} />
    </div>
  );
}
