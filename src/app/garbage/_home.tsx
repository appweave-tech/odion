'use client';

import * as React from 'react';
import { VillaPicker } from '@/components/VillaPicker';
import { Button } from '@/components/ui/button';
import { markSkip, unmarkSkip, getVillaSkipDates } from '@/lib/actions/skip';
import { toast } from 'sonner';
import { todayIST, formatISTDate, daysAgoIST, cn, EDIT_WINDOW_DAYS } from '@/lib/utils';
import { setVilla as cacheVilla } from '@/lib/device';
import { Flag, Check, X, Home, Users } from 'lucide-react';
import type { Villa } from '@/lib/types';

type ClaimedVilla = { id: string; label: string } | null;

export function GarbageHome({
  claimedVilla,
  villaCount,
}: {
  claimedVilla: ClaimedVilla;
  villaCount: number;
}) {
  // Source of truth is the server-resolved villa; the picker may add a new
  // claim mid-session and update local state without a page reload.
  const [villa, setVilla] = React.useState<ClaimedVilla>(claimedVilla);

  function onPicked(v: Villa) {
    setVilla({ id: v.id, label: v.label });
    // Mirror to localStorage so Settings (which still reads from device.ts)
    // sees the same villa without an extra round-trip.
    cacheVilla(v.id, v.label);
  }

  if (!villa) {
    return (
      <div className="p-5 grid gap-4">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
          <Home className="size-6 text-primary mb-2" />
          <h2 className="text-xl font-semibold">Welcome!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            First time here — tell us which villa you live in. We'll remember on this device.
          </p>
          <div className="mt-4">
            <VillaPicker
              onPicked={onPicked}
              trigger={
                <Button size="lg" className="w-full">
                  Pick my villa
                </Button>
              }
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="size-3.5" /> Neighbours
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{villaCount}</div>
          <div className="text-xs text-muted-foreground">villas registered</div>
        </div>
      </div>
    );
  }

  return <VillaView villaId={villa.id} villaLabel={villa.label} />;
}

function VillaView({ villaId, villaLabel }: { villaId: string; villaLabel: string }) {
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useTransition();
  const today = todayIST();

  const refresh = React.useCallback(() => {
    return getVillaSkipDates(villaId, 14).then((d) => setSkipped(new Set(d)));
  }, [villaId]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVillaSkipDates(villaId, 14).then((d) => {
      if (!cancelled) {
        setSkipped(new Set(d));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [villaId]);

  function toggle(date: string) {
    const wasSkipped = skipped.has(date);
    // Optimistic state + optimistic toast. The toast fires immediately on tap
    // so the resident feels the response in <16ms; the server call happens in
    // the background and only surfaces if it fails.
    setSkipped((s) => {
      const n = new Set(s);
      if (wasSkipped) n.delete(date);
      else n.add(date);
      return n;
    });
    let toastId: string | number | undefined;
    if (date === today) {
      toastId = wasSkipped ? toast.success('Unmarked') : toast.success('Marked skipped for today');
    }
    setPending(async () => {
      try {
        if (wasSkipped) await unmarkSkip({ villaId, date });
        else await markSkip({ villaId, date });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not update';
        if (toastId !== undefined) toast.dismiss(toastId);
        toast.error(msg);
        console.error(e);
        await refresh();
      }
    });
  }

  const days = Array.from({ length: EDIT_WINDOW_DAYS }, (_, i) => daysAgoIST(i));
  const todaySkipped = skipped.has(today);

  return (
    <div className="p-5 grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Your villa</div>
        <div className="text-2xl font-semibold">{villaLabel}</div>
        <div className="text-sm text-muted-foreground mt-1">{formatISTDate(today)}</div>
      </div>

      <div className="grid gap-2">
        <Button
          size="lg"
          variant="destructive"
          aria-pressed={todaySkipped}
          className={cn(
            'w-full h-20 text-lg rounded-2xl',
            todaySkipped &&
              'bg-destructive/10 text-destructive hover:bg-destructive/15 border border-destructive/30',
          )}
          onClick={() => toggle(today)}
          disabled={loading}
        >
          {todaySkipped ? (
            <>
              <Flag className="size-6 fill-current" /> Skipped today
            </>
          ) : (
            <>
              <Flag className="size-6" /> Mark today as skipped
            </>
          )}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Past {EDIT_WINDOW_DAYS} days</h3>
        {loading ? (
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        ) : (
          <ul className="grid gap-2">
            {days.map((d) => {
              const isSkipped = skipped.has(d);
              return (
                <li key={d}>
                  <button
                    onClick={() => toggle(d)}
                    aria-pressed={isSkipped}
                    aria-label={`${formatISTDate(d)} — currently ${isSkipped ? 'skipped' : 'collected'}, tap to toggle`}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border bg-card px-4 py-3 min-h-tap',
                      'active:bg-accent transition',
                      isSkipped && 'border-destructive/40 bg-destructive/5',
                    )}
                  >
                    <span className="text-base">{formatISTDate(d)}</span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border',
                        isSkipped
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-muted text-muted-foreground border-transparent',
                      )}
                    >
                      {isSkipped ? (
                        <>
                          <X className="size-4" /> Skipped
                        </>
                      ) : (
                        <>
                          <Check className="size-4" /> Collected
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Older edits need admin help.
        </p>
      </div>
    </div>
  );
}
