import { listSkipsLastNDays, listTodaySkips } from '@/lib/actions/skip';
import { renderEodDigest } from '@/lib/actions/eod';
import { Heatmap } from '@/components/Heatmap';
import { CopyWhatsApp } from '@/components/CopyWhatsApp';
import { formatISTDate, todayIST } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function HistoryPage() {
  const today = todayIST();
  const [skips, todaySkips, digest] = await Promise.all([
    listSkipsLastNDays(180),
    listTodaySkips(),
    renderEodDigest(),
  ]);

  const byDate = new Map<string, typeof skips>();
  for (const s of skips) {
    const k = String(s.skip_date);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(s);
  }
  // History list = everything older than today; today gets its own section above.
  const pastDates = Array.from(byDate.keys()).filter((d) => d !== today).sort().reverse();
  const heatmap: Record<string, number> = Object.fromEntries(
    Array.from(byDate.keys()).map((d) => [d, byDate.get(d)!.length]),
  );

  return (
    <div className="p-5 grid gap-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">History</div>
        <h1 className="text-2xl font-semibold">Community skips</h1>
      </header>

      <section className="rounded-2xl border bg-card p-4 grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium">Today · {formatISTDate(today, 'EEE, d MMM')}</h2>
          <span className="text-sm text-muted-foreground shrink-0">
            {todaySkips.length === 0
              ? 'none yet'
              : `${todaySkips.length} skipped`}
          </span>
        </div>
        {todaySkips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {todaySkips.map((s) => (
              <Link
                key={s.id}
                href={`/garbage/villa/${encodeURIComponent(s.villa_label)}`}
                className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium min-h-10 inline-flex items-center active:bg-destructive/15"
              >
                {s.villa_label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No skips reported yet today.</p>
        )}
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground active:text-foreground select-none">
            WhatsApp digest
          </summary>
          <div className="mt-3 [&_pre]:font-mono">
            <CopyWhatsApp text={digest.text} />
          </div>
        </details>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-base font-medium mb-2">Last 180 days</h2>
        <Heatmap byDate={heatmap} days={180} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-base font-medium text-muted-foreground">Past days</h2>
        {pastDates.length === 0 ? (
          <p className="text-base text-muted-foreground">No earlier skips on record.</p>
        ) : (
          <ul className="grid gap-2">
            {pastDates.map((d) => {
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
