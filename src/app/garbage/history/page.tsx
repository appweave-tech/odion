import { listSkipsLastNDays } from '@/lib/actions/skip';
import { Heatmap } from '@/components/Heatmap';
import { formatISTDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function HistoryPage() {
  const skips = await listSkipsLastNDays(180);

  // group by date
  const byDate = new Map<string, typeof skips>();
  for (const s of skips) {
    const k = String(s.skip_date);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(s);
  }
  const dates = Array.from(byDate.keys()).sort().reverse();
  const heatmap: Record<string, number> = Object.fromEntries(
    dates.map((d) => [d, byDate.get(d)!.length]),
  );

  return (
    <div className="p-5 grid gap-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">History</div>
        <h1 className="text-2xl font-semibold">Community skips</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Last 180 days · {skips.length} total events
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-base font-medium mb-2">Heatmap</h2>
        <Heatmap byDate={heatmap} days={180} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-base font-medium text-muted-foreground">Days</h2>
        {dates.length === 0 ? (
          <p className="text-base text-muted-foreground">No skips reported yet.</p>
        ) : (
          <ul className="grid gap-2">
            {dates.map((d) => {
              const items = byDate.get(d)!;
              return (
                <li key={d} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-base">{formatISTDate(d, 'EEE, d MMM')}</div>
                    <div className="text-sm text-muted-foreground shrink-0">
                      {items.length} skipped
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {items.map((s) => (
                      <Link
                        key={s.id}
                        href={`/garbage/villa/${encodeURIComponent(s.villa_label)}`}
                        className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium min-h-10 inline-flex items-center active:bg-accent"
                      >
                        {s.villa_label}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
