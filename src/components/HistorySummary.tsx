import { formatISTDate } from '@/lib/utils';

// Headline numbers above the chart — the RWA's evidence story in one line.
// "23 skips · 11 days · peak 5 (Wed 30 Apr)" is what gets screenshot to BBMP.
export function HistorySummary({
  total,
  dayCount,
  peakCount,
  peakDate,
}: {
  total: number;
  dayCount: number;
  peakCount: number;
  peakDate: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Skips" value={total} />
      <Stat label="Days" value={dayCount} suffix=" w/ skips" />
      <Stat
        label="Peak"
        value={peakCount}
        suffix={peakDate ? ` · ${formatISTDate(peakDate, 'd MMM')}` : ''}
      />
    </div>
  );
}

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums leading-tight">
        {value}
        {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
