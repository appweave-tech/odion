'use client';

import * as React from 'react';
import { cn, daysAgoIST } from '@/lib/utils';

export function Heatmap({
  byDate,
  days = 180,
  max,
}: {
  byDate: Record<string, number>;
  days?: number;
  max?: number;
}) {
  // Use IST date keys so we line up with skip_date stored in IST.
  const cells: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = daysAgoIST(i);
    cells.push({ date: key, count: byDate[key] ?? 0 });
  }
  const peak = max ?? Math.max(1, ...cells.map((c) => c.count));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 py-2"
        style={{ gridAutoColumns: '10px' }}
      >
        {cells.map((c) => {
          const tier = bucket(c.count, peak);
          return (
            <div
              key={c.date}
              title={`${c.date}: ${c.count}`}
              className={cn(
                'size-[10px] rounded-[2px]',
                tier === 0 && 'bg-muted',
                tier === 1 && 'bg-skip-1',
                tier === 2 && 'bg-skip-2',
                tier === 3 && 'bg-skip-3',
                tier === 4 && 'bg-skip-4',
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Less
        <div className="size-[10px] rounded-[2px] bg-muted" />
        <div className="size-[10px] rounded-[2px] bg-skip-1" />
        <div className="size-[10px] rounded-[2px] bg-skip-2" />
        <div className="size-[10px] rounded-[2px] bg-skip-3" />
        <div className="size-[10px] rounded-[2px] bg-skip-4" />
        More
      </div>
    </div>
  );
}

function bucket(n: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (n === 0) return 0;
  const r = n / peak;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}
