'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { adminVerifyVilla, adminDeleteVilla, adminRestoreVilla } from '@/lib/actions/admin';
import type { Villa } from '@/lib/types';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'pending' | 'verified' | 'deleted';

export function AdminVillas({ villas }: { villas: Villa[] }) {
  const [pending, setPending] = React.useTransition();
  const [filter, setFilter] = React.useState<Filter>('all');
  const confirm = useConfirm();

  const filtered = villas.filter((v) => {
    if (filter === 'all') return !v.deleted_at;
    if (filter === 'deleted') return !!v.deleted_at;
    if (filter === 'pending') return !v.deleted_at && !v.verified;
    return !v.deleted_at && v.verified;
  });

  function verify(id: string) {
    setPending(async () => {
      try {
        await adminVerifyVilla(id);
        toast.success('Verified');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }
  function del(id: string, label: string) {
    confirm({
      title: `Delete villa ${label}?`,
      description: 'Its skip events stay on record. You can restore the villa later from the Deleted filter.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () =>
        new Promise<void>((resolve) => {
          setPending(async () => {
            try {
              await adminDeleteVilla(id);
              toast.success('Deleted (soft)');
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed');
            } finally {
              resolve();
            }
          });
        }),
    });
  }
  function restore(id: string) {
    setPending(async () => {
      try {
        await adminRestoreVilla(id);
        toast.success('Restored');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  const counts = {
    all: villas.filter((v) => !v.deleted_at).length,
    pending: villas.filter((v) => !v.deleted_at && !v.verified).length,
    verified: villas.filter((v) => !v.deleted_at && v.verified).length,
    deleted: villas.filter((v) => !!v.deleted_at).length,
  };

  return (
    <div className="p-5 grid gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Villas</h1>
        <span className="text-sm text-muted-foreground">{counts.all} active</span>
      </header>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'verified', 'deleted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm capitalize min-h-10',
              filter === f && 'bg-primary text-primary-foreground border-primary',
            )}
          >
            {f} <span className="opacity-70">· {counts[f]}</span>
          </button>
        ))}
      </div>
      <ul className="rounded-2xl border bg-card divide-y">
        {filtered.map((v) => (
          <li key={v.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium text-base">{v.label}</div>
              <div className="text-xs text-muted-foreground">
                {v.deleted_at
                  ? 'soft-deleted'
                  : v.verified
                    ? 'verified'
                    : v.auto_created
                      ? 'auto-created · pending'
                      : 'pending'}
              </div>
            </div>
            {v.deleted_at ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => restore(v.id)}>
                <RotateCcw className="size-4" /> Restore
              </Button>
            ) : (
              <>
                {v.verified ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => verify(v.id)}>
                    <AlertCircle className="size-4" /> Verify
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => del(v.id, v.label)}
                  aria-label="Delete"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
