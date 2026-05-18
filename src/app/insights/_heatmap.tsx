import type { CategoryStat, TrendBucket } from '@/lib/types';

export function CategoryHeatmap({
  categories,
  trend,
  weeks,
}: {
  categories: CategoryStat[];
  trend: TrendBucket[];
  weeks: number;
}) {
  const active = categories.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  if (active.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }

  const weekStarts = lastNWeekStarts(weeks);
  const grid = new Map<string, Map<string, number>>();
  for (const t of trend) {
    if (!grid.has(t.category)) grid.set(t.category, new Map());
    grid.get(t.category)!.set(t.week_start, t.count);
  }
  const max = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="min-w-[640px]">
      <div
        className="grid items-center text-[10px] text-muted-foreground gap-1"
        style={{ gridTemplateColumns: `120px repeat(${weekStarts.length}, minmax(28px, 1fr))` }}
      >
        <div />
        {weekStarts.map((w) => (
          <div key={w} className="text-center tabular-nums">
            {formatWeekLabel(w)}
          </div>
        ))}
      </div>
      {active.map((c) => (
        <div
          key={c.category}
          className="grid items-center gap-1 mt-1"
          style={{ gridTemplateColumns: `120px repeat(${weekStarts.length}, minmax(28px, 1fr))` }}
        >
          <div className="text-xs flex items-center gap-1.5 truncate pr-2">
            <span>{c.emoji}</span>
            <span className="truncate">{c.label}</span>
          </div>
          {weekStarts.map((w) => {
            const v = grid.get(c.category)?.get(w) ?? 0;
            const alpha = v === 0 ? 0 : 0.15 + 0.85 * (v / max);
            const bg = v === 0 ? 'transparent' : (c.color ?? '#94a3b8');
            return (
              <div
                key={w}
                className="h-7 rounded text-[10px] flex items-center justify-center tabular-nums border"
                style={{
                  background: bg,
                  opacity: v === 0 ? 1 : alpha,
                  borderColor: v === 0 ? 'hsl(var(--border))' : 'transparent',
                  color: v > 0 && alpha > 0.55 ? 'white' : 'hsl(var(--muted-foreground))',
                }}
                title={`${c.label} · week of ${w} · ${v} msgs`}
              >
                {v > 0 ? v : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function lastNWeekStarts(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  // postgres date_trunc('week') uses Monday as start. JS getDay(): Sun=0..Sat=6.
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayOfWeek);
  d.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const wd = new Date(d);
    wd.setUTCDate(wd.getUTCDate() - i * 7);
    out.push(wd.toISOString().slice(0, 10));
  }
  return out;
}

function formatWeekLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
