import { cn, daysAgoIST, formatISTDate, todayIST } from '@/lib/utils';

const BAR_PX = 192;
const LABEL_PX = 16;
const CHART_PX = BAR_PX + LABEL_PX;

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
  const peak = Math.max(1, ...cells.map((c) => c.count));
  const showMid = peak > 1;
  const midLabel = Math.ceil(peak / 2);

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
          aria-label={`Skips per day, last ${days} days, peak ${peak}`}
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
              return (
                <div
                  key={c.date}
                  className="flex-1 flex flex-col items-center min-w-0"
                  title={`${formatISTDate(c.date, 'EEE, d MMM')} · ${c.count} skipped`}
                >
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
                          ? 'bg-destructive'
                          : 'bg-gradient-to-t from-destructive to-destructive/50'),
                    )}
                    style={{ height: `${barPx}px` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.75rem_1fr] gap-2">
        <span aria-hidden />
        <div className="flex justify-between text-[11px] tabular-nums">
          <span className="text-muted-foreground">{formatISTDate(cells[0].date, 'd MMM')}</span>
          <span className="font-medium text-destructive">Today</span>
        </div>
      </div>
    </div>
  );
}
