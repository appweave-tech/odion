'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { findOrCreateVilla, claimVilla } from '@/lib/actions/villas';
import { getDeviceId, setVilla, setName, getName } from '@/lib/device';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Villa } from '@/lib/types';

type Phase = { phase: string; count: number };

export function VillaPicker({
  phases,
  allVillas,
  trigger,
  onPicked,
}: {
  phases: Phase[];
  allVillas: Villa[];
  trigger: React.ReactNode;
  onPicked?: (v: Villa) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const [phase, setPhase] = React.useState('');
  const [number, setNumber] = React.useState('');

  const [showFallback, setShowFallback] = React.useState(false);
  const [newPhase, setNewPhase] = React.useState('');
  const [newNumber, setNewNumber] = React.useState('');

  const [step, setStep] = React.useState<'pick' | 'name'>('pick');
  const [pendingVilla, setPendingVilla] = React.useState<Villa | null>(null);
  const [name, setNameInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Filter client-side from preloaded list — no server round-trip on phase change.
  const villasInPhase = React.useMemo(
    () => (phase ? allVillas.filter((v) => v.phase === phase) : []),
    [allVillas, phase],
  );

  // Reset villa # when phase changes
  React.useEffect(() => {
    setNumber('');
  }, [phase]);

  function reset() {
    setPhase('');
    setNumber('');
    setShowFallback(false);
    setNewPhase('');
    setNewNumber('');
    setStep('pick');
    setPendingVilla(null);
  }

  async function pickExisting() {
    if (!phase || !number) {
      toast.error('Pick phase and villa number');
      return;
    }
    const v = villasInPhase.find((x) => String(x.number) === number);
    if (!v) {
      toast.error('Villa not found in this phase');
      return;
    }
    setPendingVilla(v);
    setNameInput(getName());
    setStep('name');
  }

  async function addCustom() {
    const p = newPhase.trim().toUpperCase();
    const n = Number(newNumber);
    if (!p) {
      toast.error('Enter a phase (e.g. P1, NGC)');
      return;
    }
    if (!n) {
      toast.error('Enter a villa number');
      return;
    }
    setSubmitting(true);
    try {
      const villa = await findOrCreateVilla(p, n);
      setPendingVilla(villa);
      setNameInput(getName());
      setStep('name');
    } catch (e) {
      toast.error('Could not add villa');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmName() {
    if (!pendingVilla) return;
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      await claimVilla(deviceId, pendingVilla.id, { name: name.trim() || undefined });
      setVilla(pendingVilla.id, pendingVilla.label);
      setName(name.trim());
      toast.success(`You're villa ${pendingVilla.label}`);
      onPicked?.(pendingVilla);
      setOpen(false);
      reset();
    } catch (e) {
      toast.error('Could not save villa');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const title =
    step === 'name' ? 'Your name (optional)' : showFallback ? 'Add my villa' : 'Pick your villa';

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={title}>
        {step === 'pick' && !showFallback && (
          <div className="grid gap-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">Phase</span>
                <NativeSelect value={phase} onChange={(e) => setPhase(e.target.value)}>
                  <option value="">— Select —</option>
                  {phases.map((p) => (
                    <option key={p.phase} value={p.phase}>
                      {p.phase}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">Villa #</span>
                <NativeSelect
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={!phase}
                >
                  <option value="">— Select —</option>
                  {villasInPhase.map((v) => (
                    <option key={v.id} value={String(v.number)}>
                      {v.number}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
            <Button size="lg" onClick={pickExisting} disabled={!phase || !number}>
              Continue
            </Button>
            <button
              type="button"
              className="text-sm text-primary underline-offset-4 hover:underline min-h-10"
              onClick={() => setShowFallback(true)}
            >
              Can't find my villa →
            </button>
          </div>
        )}

        {step === 'pick' && showFallback && (
          <div className="grid gap-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Type your phase and villa number. We'll add it now and admin will verify later.
            </p>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Phase (e.g. P1, P2, NGC)</span>
              <Input
                autoFocus
                autoComplete="off"
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                placeholder="P1"
                autoCapitalize="characters"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-muted-foreground">Villa number</span>
              <Input
                autoComplete="off"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="35"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </label>
            <Button size="lg" onClick={addCustom} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add my villa'}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline min-h-10"
              onClick={() => setShowFallback(false)}
            >
              ← Back to phase list
            </button>
          </div>
        )}

        {step === 'name' && pendingVilla && (
          <div className="grid gap-3 pt-2">
            <p className="text-sm text-muted-foreground">
              You picked <span className="font-medium text-foreground">{pendingVilla.label}</span>. Your name shows up
              next to skips you report. Optional — leave blank to stay anonymous.
            </p>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name (optional)"
            />
            <Button size="lg" disabled={submitting} onClick={confirmName}>
              {submitting ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-tap w-full rounded-xl border bg-card px-3 py-3 text-base appearance-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        'bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%2364748b\' d=\'M6 8 0 0h12z\'/></svg>")] bg-no-repeat bg-[right_0.75rem_center] pr-9',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
