import { cn } from '@/lib/utils';

// 4 weeks of 7 days each, oldest first. Tells the RWA "this week was bad vs
// last week" at a glance, which is the metric they actually present to BBMP.
// The chart shows daily detail; this strip surfaces the trend.
type Week = { label: string; count: number };

export function WeeklyAggregate({ weeks }: { weeks: Week[] }) {
  const peak = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <ul className="grid grid-cols-4 gap-2" aria-label="Skips by week">
      {weeks.map((w) => {
        const isPeak = w.count > 0 && w.count === peak;
        return (
          <li
            key={w.label}
            className={cn(
              'rounded-xl border bg-card px-2.5 py-2',
              isPeak && 'border-destructive/30 bg-destructive/5',
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {w.label}
            </div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums leading-tight">
              {w.count}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
