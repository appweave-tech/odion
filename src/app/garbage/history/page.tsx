import { listSkipsLastNDays } from '@/lib/actions/skip';
import { SkipBarChart } from '@/components/SkipBarChart';
import { SkipsByDate } from '@/components/SkipsByDate';
import { HistorySummary } from '@/components/HistorySummary';
import { WeeklyAggregate } from '@/components/WeeklyAggregate';
import { daysAgoIST } from '@/lib/utils';

// ISR: re-render at most once every 60s. Chart shows the recent slice that
// the RWA actively monitors; the date picker can still drill into older days
// within the fetched window.
export const revalidate = 60;

// Chart, summary, weekly aggregate, recent chips all show CHART_DAYS.
// The "Browse other days" date picker keeps the full PICKER_DAYS window so
// residents can still pull up an older specific date.
const CHART_DAYS = 15;
const PICKER_DAYS = 30;
const WEEKS = 2; // 2 × 7 = 14, covers the 15-day chart window cleanly

export default async function HistoryPage() {
  const allSkips = await listSkipsLastNDays(PICKER_DAYS);

  // Slice the data for the chart/summary/weekly/chip surfaces to the last
  // CHART_DAYS window. SkipsByDate gets the full set so the date picker can
  // still reach back to PICKER_DAYS.
  const chartCutoff = daysAgoIST(CHART_DAYS - 1);
  const chartSkips = allSkips.filter((s) => String(s.skip_date) >= chartCutoff);

  const byDate: Record<string, number> = {};
  for (const s of chartSkips) {
    const k = String(s.skip_date);
    byDate[k] = (byDate[k] ?? 0) + 1;
  }

  const total = chartSkips.length;
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
  const weekLabels = WEEKS === 2 ? ['Last week', 'This week'] : ['3 wks ago', '2 wks ago', 'Last week', 'This week'];
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const weekIndex = WEEKS - 1 - i;
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
        <h1 className="text-2xl font-semibold">Skips · last {CHART_DAYS} days</h1>
      </header>

      <HistorySummary
        total={total}
        dayCount={dayCount}
        peakCount={peakCount}
        peakDate={peakDate}
      />

      <section className="rounded-2xl border bg-card p-4">
        <SkipBarChart byDate={byDate} days={CHART_DAYS} />
      </section>

      {total > 0 && <WeeklyAggregate weeks={weeks} />}

      <SkipsByDate skips={allSkips} chartDays={CHART_DAYS} pickerDays={PICKER_DAYS} />
    </div>
  );
}
