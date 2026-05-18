import { listTodaySkips } from '@/lib/actions/skip';
import { renderEodDigest } from '@/lib/actions/eod';
import { CopyWhatsApp } from '@/components/CopyWhatsApp';
import { formatISTDate, todayIST } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function TodayPage() {
  const skips = await listTodaySkips();
  const digest = await renderEodDigest();
  const today = todayIST();

  return (
    <div className="p-5 grid gap-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Today</div>
        <h1 className="text-2xl font-semibold">{formatISTDate(today)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {skips.length === 0 ? 'No skips reported yet.' : `${skips.length} villa${skips.length === 1 ? '' : 's'} reported skipped.`}
        </p>
      </header>

      {skips.length > 0 && (
        <ul className="rounded-2xl border bg-card divide-y">
          {skips.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3 min-h-tap gap-3">
              <div className="font-medium text-base">{s.villa_label}</div>
              {s.reporter_name ? (
                <div className="text-sm text-muted-foreground">{s.reporter_name}</div>
              ) : (
                <div className="text-xs text-muted-foreground/70 italic">anonymous</div>
              )}
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">WhatsApp message</h2>
        <div className="[&_pre]:font-mono">
          <CopyWhatsApp text={digest.text} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Auto-refreshes every minute. Final digest is generated at 20:00 IST.
        </p>
      </section>
    </div>
  );
}
