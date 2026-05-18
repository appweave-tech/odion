'use client';

import * as React from 'react';
import { getVilla } from '@/lib/device';
import { VillaPicker } from '@/components/VillaPicker';
import { Button } from '@/components/ui/button';
import { Home, Users, AlertCircle } from 'lucide-react';
import type { Villa } from '@/lib/types';

type Phase = { phase: string; count: number };
type Stats = { villas: number; skipsToday: number };

export function VillaGate({
  phases,
  allVillas,
  stats,
  children,
}: {
  phases: Phase[];
  allVillas: Villa[];
  stats: Stats;
  children: (villa: { id: string; label: string }) => React.ReactNode;
}) {
  const [villa, setVillaState] = React.useState<{ id: string; label: string } | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setVillaState(getVilla());
    setHydrated(true);
  }, []);

  function onPicked(v: Villa) {
    setVillaState({ id: v.id, label: v.label });
  }

  if (!hydrated) {
    return (
      <div className="p-5">
        <div className="h-20 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
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
              phases={phases}
              allVillas={allVillas}
              onPicked={onPicked}
              trigger={
                <Button size="lg" className="w-full">
                  Pick my villa
                </Button>
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Users className="size-3.5" /> Neighbours
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.villas}</div>
            <div className="text-xs text-muted-foreground">villas registered</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="size-3.5" /> Today
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.skipsToday}</div>
            <div className="text-xs text-muted-foreground">
              skip{stats.skipsToday === 1 ? '' : 's'} reported
            </div>
          </div>
        </div>

      </div>
    );
  }

  return <>{children(villa)}</>;
}
