'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { cn, daysAgoIST, formatISTDate, todayIST } from '@/lib/utils';
import type { SkipEventWithVilla } from '@/lib/types';

const RECENT_DAYS_SHOWN = 2;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function SkipsByDate({
  skips,
  days = 30,
}: {
  skips: SkipEventWithVilla[];
  days?: number;
}) {
  const today = todayIST();
  const minDate = daysAgoIST(days - 1);
  // ?date= arrives when the user taps a chart bar. Auto-opens the panel and
  // scrolls it into view so the drill-in feels like a single gesture.
  const searchParams = useSearchParams();
  const urlDate = searchParams.get('date');
  const initialDate = urlDate && DATE_RE.test(urlDate) ? urlDate : today;
  const [open, setOpen] = React.useState(!!urlDate);
  const [date, setDate] = React.useState(initialDate);
  const rootRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!urlDate || !DATE_RE.test(urlDate)) return;
    setDate(urlDate);
    setOpen(true);
    // Defer scroll so the panel has expanded before we measure.
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [urlDate]);

  const byDate = React.useMemo(() => {
    const m = new Map<string, SkipEventWithVilla[]>();
    for (const s of skips) {
      const k = String(s.skip_date);
      const list = m.get(k) ?? [];
      list.push(s);
      m.set(k, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.villa_label.localeCompare(b.villa_label, undefined, { numeric: true }));
    }
    return m;
  }, [skips]);

  const recentDates = React.useMemo(
    () => Array.from(byDate.keys()).sort().reverse().slice(0, RECENT_DAYS_SHOWN),
    [byDate],
  );

  const villas = byDate.get(date) ?? [];

  return (
    <>
      {recentDates.length > 0 && (
        <section aria-label="Recent skips" className="grid gap-4">
          {recentDates.map((d) => {
            const list = byDate.get(d)!;
            const isToday = d === today;
            const isYesterday = d === daysAgoIST(1);
            const prefix = isToday ? 'Today · ' : isYesterday ? 'Yesterday · ' : '';
            return (
              <div key={d}>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {prefix}
                    {formatISTDate(d, 'EEE, d MMM')}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {list.length} skipped
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {list.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/garbage/villa/${encodeURIComponent(s.villa_label)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 text-sm font-medium min-h-10 active:bg-destructive/15 transition"
                      >
                        <Flag className="size-3.5 fill-current" />
                        {s.villa_label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section
        id="skip-by-date"
        ref={rootRef}
        className="rounded-2xl border bg-card scroll-mt-20"
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-tap text-left active:bg-accent rounded-2xl transition"
        >
          <span className="flex items-center gap-3">
            <CalendarDays className="size-5 text-muted-foreground shrink-0" />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Browse other days</span>
              <span className="text-xs text-muted-foreground">Pick any date in the last 30 days</span>
            </span>
          </span>
          {open ? (
            <ChevronDown className="size-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-5 text-muted-foreground shrink-0" />
          )}
        </button>

        {open && (
          <div className="border-t px-4 py-4 grid gap-3">
            <label className="grid gap-1.5 text-sm">
              <span className="text-muted-foreground">Date</span>
              <input
                type="date"
                value={date}
                min={minDate}
                max={today}
                onChange={(e) => setDate(e.target.value || today)}
                className="w-full min-h-tap rounded-xl border bg-background px-3 py-2 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{formatISTDate(date)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {villas.length} skipped
              </span>
            </div>

            {villas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No villas reported skipped on this day.
              </p>
            ) : (
              <ul className="rounded-xl border divide-y">
                {villas.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/garbage/villa/${encodeURIComponent(v.villa_label)}`}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 min-h-tap',
                        'active:bg-accent transition',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Flag className="size-4 text-destructive shrink-0" />
                        <span className="text-base font-medium">{v.villa_label}</span>
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[40%] text-right">
                        {v.reporter_name ?? '—'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </>
  );
}
