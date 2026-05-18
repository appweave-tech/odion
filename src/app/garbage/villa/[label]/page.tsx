import { sql } from '@/lib/db';
import { Heatmap } from '@/components/Heatmap';
import { formatISTDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import type { Villa } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LABEL_RE = /^[A-Z0-9]{1,8}-\d{1,4}$/;

export default async function VillaPage({ params }: { params: { label: string } }) {
  const label = decodeURIComponent(params.label);
  if (label.length > 16 || !LABEL_RE.test(label)) notFound();
  const [villa] = await sql()<Villa[]>`
    SELECT id, phase, number, label, display_order, auto_created, verified, created_at
    FROM odion.villas WHERE label = ${label} LIMIT 1
  `;
  if (!villa) notFound();

  const skipRows = await sql()<{ skip_date: string; created_at: string; reporter_name: string | null }[]>`
    SELECT e.skip_date::text AS skip_date, e.created_at, d.name AS reporter_name
    FROM odion.garbage_skip_events_current e
    LEFT JOIN odion.devices d ON d.id = e.reported_by_device
    WHERE e.villa_id = ${villa.id} AND e.void = false
    ORDER BY e.skip_date DESC
  `;

  const byDate: Record<string, number> = {};
  for (const r of skipRows) byDate[String(r.skip_date)] = 1;

  return (
    <div className="p-5 grid gap-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Villa</div>
        <h1 className="text-2xl font-semibold">{villa.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {skipRows.length} skip{skipRows.length === 1 ? '' : 's'} on record
          {!villa.verified && <span className="ml-2 text-amber-600">· pending verification</span>}
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-medium mb-2">180-day heatmap</h2>
        <Heatmap byDate={byDate} days={180} max={1} />
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Skip log</h2>
        {skipRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skips recorded for this villa.</p>
        ) : (
          <ul className="rounded-2xl border bg-card divide-y">
            {skipRows.map((r, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <span>{formatISTDate(String(r.skip_date))}</span>
                <span className="text-xs text-muted-foreground">{r.reporter_name ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
