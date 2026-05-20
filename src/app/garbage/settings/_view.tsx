'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VillaPicker } from '@/components/VillaPicker';
import { getName, setName, getVilla, clearVilla } from '@/lib/device';
import { toast } from 'sonner';

export function SettingsView() {
  const [villa, setVillaState] = React.useState<{ id: string; label: string } | null>(null);
  const [name, setNameInput] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setVillaState(getVilla());
    setNameInput(getName());
    setHydrated(true);
  }, []);

  function saveName() {
    setName(name.trim());
    toast.success('Name saved');
  }

  function reset() {
    clearVilla();
    setVillaState(null);
    toast.success('Cleared villa from this device');
  }

  if (!hydrated) return null;

  return (
    <div className="p-5 grid gap-6">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Settings</div>
        <h1 className="text-2xl font-semibold">Your device</h1>
      </header>

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Villa on this device</div>
          <div className="text-lg font-semibold">{villa?.label ?? 'Not set'}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <VillaPicker
            onPicked={(v) => setVillaState({ id: v.id, label: v.label })}
            trigger={<Button variant="outline">Change villa</Button>}
          />
          <Button variant="outline" onClick={reset} disabled={!villa}>
            Clear
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">Your name (shown next to your reports)</span>
          <Input value={name} onChange={(e) => setNameInput(e.target.value)} placeholder="Optional" />
        </label>
        <Button onClick={saveName}>Save</Button>
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-2 text-sm">
        <div className="font-medium">Privacy</div>
        <p className="text-muted-foreground">
          Your villa selection is stored on this device. Names are optional and visible to other residents next to
          skips you report. No login, no tracking.
        </p>
      </section>

      <a
        href="/garbage/admin"
        className="rounded-2xl border bg-card p-5 min-h-tap flex items-center justify-between active:bg-accent text-sm"
      >
        <span className="font-medium">Admin</span>
        <span aria-hidden className="text-muted-foreground">→</span>
      </a>
    </div>
  );
}
