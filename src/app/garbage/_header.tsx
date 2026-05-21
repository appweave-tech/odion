'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useVilla } from '@/lib/device';

// Client-side chip — reads localStorage and listens for the in-tab
// VILLA_CHANGED_EVENT so picker claims / Settings clears update instantly,
// without depending on RSC layout cache invalidation (which proved
// unreliable in App Router 14 for layout-segment re-renders after
// revalidatePath). Trade-off: no chip in the SSR payload, brief absence on
// first paint until hydration. The chip is decorative so the flicker is
// acceptable; the page body is still SSR'd with full data.
export function GarbageHeader() {
  const villa = useVilla();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
      <Link href="/garbage" className="block min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Odion</div>
        <div className="text-base font-semibold truncate">Garbage Pickup Tracker</div>
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
