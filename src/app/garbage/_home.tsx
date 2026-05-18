'use client';

import * as React from 'react';
import { VillaGate } from '@/components/VillaGate';
import { Button } from '@/components/ui/button';
import { markSkip, unmarkSkip, getVillaSkipDates } from '@/lib/actions/skip';
import { getDeviceId } from '@/lib/device';
import { toast } from 'sonner';
import { todayIST, formatISTDate, daysAgoIST, cn } from '@/lib/utils';
import { Trash2, CheckCircle2, Check, X } from 'lucide-react';
import type { Villa } from '@/lib/types';

type Phase = { phase: string; count: number };

export function GarbageHome({ phases, allVillas }: { phases: Phase[]; allVillas: Villa[] }) {
  return (
    <VillaGate phases={phases} allVillas={allVillas}>
      {(villa) => <VillaView villaId={villa.id} villaLabel={villa.label} />}
    </VillaGate>
  );
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
    // optimistic
    setSkipped((s) => {
      const n = new Set(s);
      if (wasSkipped) n.delete(date);
      else n.add(date);
      return n;
    });
    setPending(async () => {
      try {
        const deviceId = getDeviceId();
        if (wasSkipped) {
          await unmarkSkip({ villaId, deviceId, date });
          if (date === today) toast.success('Unmarked');
        } else {
          await markSkip({ villaId, deviceId, date });
          if (date === today) toast.success('Marked skipped for today');
        }
      } catch (e) {
        toast.error('Could not update');
        console.error(e);
        await refresh();
      }
    });
  }

  const days = Array.from({ length: 7 }, (_, i) => daysAgoIST(i));
  const todaySkipped = skipped.has(today);

  return (
    <div className="p-5 grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Your villa</div>
        <div className="text-2xl font-semibold">{villaLabel}</div>
        <div className="text-sm text-muted-foreground mt-1">{formatISTDate(today)}</div>
      </div>

      <Button
        size="lg"
        variant={todaySkipped ? 'outline' : 'default'}
        className="w-full h-20 text-lg rounded-2xl"
        onClick={() => toggle(today)}
        disabled={loading}
      >
        {todaySkipped ? (
          <>
            <CheckCircle2 className="size-6" /> Skipped (tap to undo)
          </>
        ) : (
          <>
            <Trash2 className="size-6" /> Mark today as skipped
          </>
        )}
      </Button>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Past 7 days</h3>
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
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl border bg-card px-4 py-3 min-h-tap',
                      'active:bg-accent transition',
                      isSkipped && 'border-destructive/40 bg-destructive/5',
                    )}
                  >
                    <span className="text-base">{formatISTDate(d)}</span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-sm font-medium',
                        isSkipped ? 'text-destructive' : 'text-muted-foreground',
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
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tap any day to toggle. Older edits need admin help.
        </p>
      </div>
    </div>
  );
}
