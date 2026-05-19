import { cn, daysAgoIST, formatISTDate, todayIST } from '@/lib/utils';

const MAX_BAR_PX = 200;

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

  return (
    <div className="grid gap-3">
      <div className="flex items-end gap-[3px] h-56 px-1" aria-label="Skips per day, last 30 days">
        {cells.map((c) => {
          const isToday = c.date === today;
          const barPx = c.count > 0 ? Math.max((c.count / peak) * MAX_BAR_PX, 10) : 2;
          return (
            <div
              key={c.date}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
              title={`${formatISTDate(c.date, 'EEE, d MMM')} · ${c.count} skipped`}
            >
              {c.count > 0 && (
                <span className="text-[10px] font-semibold tabular-nums text-foreground leading-none">
                  {c.count}
                </span>
              )}
              <div
                className={cn(
                  'w-full rounded-sm',
                  c.count === 0 ? 'bg-muted' : isToday ? 'bg-destructive' : 'bg-destructive/70',
                )}
                style={{ height: `${barPx}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{formatISTDate(cells[0].date, 'd MMM')}</span>
        <span className="font-medium text-foreground">Today</span>
      </div>
    </div>
  );
}
