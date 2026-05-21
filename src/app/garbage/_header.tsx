import Link from 'next/link';
import { getClaimedVilla } from '@/lib/actions/villas';
import { Home } from 'lucide-react';

// Header chip tells the resident which villa this device is claimed to,
// without forcing a trip to Settings. Server-rendered from the device cookie
// so the value is always trustworthy (and updates after picker via
// router.refresh()).
//
// IMPORTANT: this component runs inside the garbage layout, *above* the
// error boundary at garbage/error.tsx. If getClaimedVilla() throws, the
// whole layout unmounts and falls through to the root error boundary,
// losing the app shell entirely. So we swallow lookup errors — without
// a chip the header still renders cleanly.
export async function GarbageHeader() {
  let villa: Awaited<ReturnType<typeof getClaimedVilla>> = null;
  try {
    villa = await getClaimedVilla();
  } catch (e) {
    console.error('[odion:header] getClaimedVilla failed; rendering without chip', e);
  }
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      <Link href="/garbage" className="block min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Odion</div>
        <div className="text-base font-semibold truncate">Garbage Tracker</div>
      </Link>
      {villa ? (
        <Link
          href="/garbage/settings"
          aria-label={`Your villa: ${villa.label}. Open settings to change.`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium tabular-nums active:bg-accent transition"
        >
          <Home aria-hidden className="size-3.5 text-primary" />
          {villa.label}
        </Link>
      ) : null}
    </header>
  );
}
