'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { cn, daysAgoIST, formatISTDate, todayIST } from '@/lib/utils';
import type { SkipEventWithVilla } from '@/lib/types';

export function SkipsByDate({
  skips,
  days = 30,
}: {
  skips: SkipEventWithVilla[];
  days?: number;
}) {
  const today = todayIST();
  const minDate = daysAgoIST(days - 1);
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(today);

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

  const villas = byDate.get(date) ?? [];

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-tap text-left active:bg-accent rounded-2xl transition"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Browse skips by date</span>
          <span className="text-xs text-muted-foreground">
            Pick a day to see which villas were skipped
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
  );
}
