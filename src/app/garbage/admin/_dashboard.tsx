'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { adminLogout } from '@/lib/actions/admin';
import { useRouter } from 'next/navigation';

export function AdminDashboard({
  stats,
}: {
  stats: { villas: number; pending: number; events: number };
}) {
  const router = useRouter();
  async function logout() {
    await adminLogout();
    router.refresh();
  }
  return (
    <div className="p-5 grid gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </header>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Villas" value={stats.villas} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Skips" value={stats.events} />
      </div>
      <Link href="/garbage/admin/villas" className="rounded-2xl border bg-card p-5 min-h-tap active:bg-accent">
        <div className="font-medium">Manage villas</div>
        <div className="text-sm text-muted-foreground">Verify, merge, delete villas</div>
      </Link>
      <Link href="/garbage/today" className="rounded-2xl border bg-card p-5 min-h-tap active:bg-accent">
        <div className="font-medium">Today's digest</div>
        <div className="text-sm text-muted-foreground">Preview + copy WhatsApp message</div>
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
