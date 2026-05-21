import Link from 'next/link';
import { cn, daysAgoIST, formatISTDate, todayIST } from '@/lib/utils';

const BAR_PX = 192;
const LABEL_PX = 16;
const CHART_PX = BAR_PX + LABEL_PX;

// Round the y-axis peak to the next "nice" number so grid labels are
// readable: 1/2/5/10/20/50/100. Avoids awkward midpoints like "0/3/5".
function niceCeil(n: number): number {
  if (n <= 1) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const normalized = n / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function SkipBarChart({
  byDate,
  days = 30,
}: {
  byDate: Record<string, number>;
  days?: number;
}) {
  const today = todayIST();
  const cells = Array.from({ length: days }, (_, i) => {
    const date = daysAgoIST(days - 1 - i);
    return { date, count: byDate[date] ?? 0 };
  });
  const rawPeak = Math.max(0, ...cells.map((c) => c.count));

  // Empty-state — replace the visual mess of 30 baseline ticks with a clear
  // "you're good" message. Residents see this often in healthy weeks.
  if (rawPeak === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        <div className="text-2xl mb-1">✓</div>
        <div className="text-sm font-medium">No skips reported in the last {days} days</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatISTDate(cells[0].date, 'd MMM')} — Today
        </div>
      </div>
    );
  }

  const peak = niceCeil(rawPeak);
  const showMid = peak > 1;
  const midLabel = peak / 2;

  // Mid-axis labels every ~7 days so a glance tells the reader when each bar
  // happened. Today's label sits in the right gutter via the existing
  // bottom-row markup.
  const axisIndices: number[] = [];
  if (days > 14) {
    for (let i = 7; i < days - 3; i += 7) {
      axisIndices.push(i);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[1.75rem_1fr] gap-2">
        <div className="relative" style={{ height: `${CHART_PX}px` }} aria-hidden>
          <span
            className="absolute right-1 text-[10px] tabular-nums text-muted-foreground leading-none"
            style={{ top: `${LABEL_PX}px`, transform: 'translateY(-50%)' }}
          >
            {peak}
          </span>
          {showMid && (
            <span
              className="absolute right-1 text-[10px] tabular-nums text-muted-foreground leading-none"
              style={{ top: `${LABEL_PX + BAR_PX / 2}px`, transform: 'translateY(-50%)' }}
            >
              {midLabel}
            </span>
          )}
          <span
            className="absolute right-1 bottom-0 text-[10px] tabular-nums text-muted-foreground leading-none"
            style={{ transform: 'translateY(50%)' }}
          >
            0
          </span>
        </div>

        <div
          className="relative"
          style={{ height: `${CHART_PX}px` }}
          aria-label={`Skips per day, last ${days} days, peak ${rawPeak}`}
        >
          <div
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ top: `${LABEL_PX}px` }}
          />
          {showMid && (
            <div
              className="absolute inset-x-0 border-t border-dashed border-border"
              style={{ top: `${LABEL_PX + BAR_PX / 2}px` }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 border-t border-foreground/40" />

          <div className="absolute inset-0 flex items-end gap-1">
            {cells.map((c) => {
              const isToday = c.date === today;
              const barPx = c.count > 0 ? Math.max((c.count / peak) * BAR_PX, 10) : 2;
              // Tapping a bar pushes a ?date= search param. SkipsByDate
              // reads it client-side, opens, scrolls into view, and
              // shows the villa list for that day. Bookmarkable URL.
              const href = c.count > 0 ? `?date=${c.date}#skip-by-date` : undefined;
              const cell = (
                <>
                  {c.count > 0 && (
                    <span className="text-[10px] font-semibold tabular-nums text-foreground leading-none mb-1">
                      {c.count}
                    </span>
                  )}
                  <div
                    className={cn(
                      'w-full rounded-sm',
                      c.count === 0 && 'bg-muted',
                      c.count > 0 &&
                        (isToday
                          ? 'bg-destructive ring-1 ring-destructive ring-offset-1 ring-offset-card'
                          : 'bg-gradient-to-t from-destructive to-destructive/50'),
                    )}
                    style={{ height: `${barPx}px` }}
                  />
                </>
              );
              return href ? (
                <Link
                  key={c.date}
                  href={href}
                  scroll={false}
                  prefetch={false}
                  className="flex-1 flex flex-col items-center justify-end min-w-0 -mb-1 pb-1 active:opacity-70"
                  aria-label={`${formatISTDate(c.date, 'EEE, d MMM')}: ${c.count} skipped — tap to see villas`}
                >
                  {cell}
                </Link>
              ) : (
                <div
                  key={c.date}
                  className="flex-1 flex flex-col items-center justify-end min-w-0"
                  aria-label={`${formatISTDate(c.date, 'EEE, d MMM')}: 0 skipped`}
                >
                  {cell}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.75rem_1fr] gap-2">
        <span aria-hidden />
        <div className="relative h-3.5 text-[11px] tabular-nums text-muted-foreground">
          <span className="absolute left-0">{formatISTDate(cells[0].date, 'd MMM')}</span>
          {axisIndices.map((i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2"
              style={{ left: `${((i + 0.5) / days) * 100}%` }}
            >
              {formatISTDate(cells[i].date, 'd MMM')}
            </span>
          ))}
          <span className="absolute right-0 font-medium text-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
