'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { adminVerifyVilla, adminDeleteVilla } from '@/lib/actions/admin';
import type { Villa } from '@/lib/types';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminVillas({ villas }: { villas: Villa[] }) {
  const [pending, setPending] = React.useTransition();
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'verified'>('all');

  const filtered = villas.filter((v) =>
    filter === 'all' ? true : filter === 'pending' ? !v.verified : v.verified,
  );

  function verify(id: string) {
    setPending(async () => {
      try {
        await adminVerifyVilla(id);
        toast.success('Verified');
      } catch (e) {
        toast.error('Failed');
        console.error(e);
      }
    });
  }
  function del(id: string) {
    if (!confirm('Delete this villa? All its skip events will be removed too.')) return;
    setPending(async () => {
      try {
        await adminDeleteVilla(id);
        toast.success('Deleted');
      } catch (e) {
        toast.error('Failed');
        console.error(e);
      }
    });
  }

  return (
    <div className="p-5 grid gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Villas</h1>
        <span className="text-sm text-muted-foreground">{villas.length} total</span>
      </header>
      <div className="flex gap-2">
        {(['all', 'pending', 'verified'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm capitalize min-h-10',
              filter === f && 'bg-primary text-primary-foreground border-primary',
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="rounded-2xl border bg-card divide-y">
        {filtered.map((v) => (
          <li key={v.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{v.label}</div>
              <div className="text-[11px] text-muted-foreground">
                {v.verified ? 'verified' : v.auto_created ? 'auto-created · pending' : 'pending'}
              </div>
            </div>
            {v.verified ? (
              <CheckCircle2 className="size-5 text-primary" />
            ) : (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => verify(v.id)}>
                <AlertCircle className="size-4" /> Verify
              </Button>
            )}
            <Button size="icon" variant="ghost" disabled={pending} onClick={() => del(v.id)} aria-label="Delete">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
