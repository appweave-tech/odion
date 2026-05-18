'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { findOrCreateVilla, claimVilla } from '@/lib/actions/villas';
import { setVilla, setName, getName } from '@/lib/device';
import { toast } from 'sonner';
import type { Villa } from '@/lib/types';
import { PhaseStep } from './villa-picker/PhaseStep';
import { CustomAddStep } from './villa-picker/CustomAddStep';
import { NameStep } from './villa-picker/NameStep';

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

  const villasInPhase = React.useMemo(
    () => (phase ? allVillas.filter((v) => v.phase === phase) : []),
    [allVillas, phase],
  );

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

  function pickExisting() {
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
      const msg = e instanceof Error ? e.message : 'Could not add villa';
      toast.error(msg);
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmName() {
    if (!pendingVilla) return;
    setSubmitting(true);
    try {
      await claimVilla(pendingVilla.id, { name: name.trim() || undefined });
      setVilla(pendingVilla.id, pendingVilla.label);
      setName(name.trim());
      toast.success(`You're villa ${pendingVilla.label}`);
      onPicked?.(pendingVilla);
      setOpen(false);
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save villa';
      toast.error(msg);
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
          <PhaseStep
            phases={phases}
            villasInPhase={villasInPhase}
            phase={phase}
            number={number}
            onPhaseChange={setPhase}
            onNumberChange={setNumber}
            onContinue={pickExisting}
            onOpenFallback={() => setShowFallback(true)}
          />
        )}
        {step === 'pick' && showFallback && (
          <CustomAddStep
            newPhase={newPhase}
            newNumber={newNumber}
            submitting={submitting}
            onNewPhaseChange={setNewPhase}
            onNewNumberChange={setNewNumber}
            onAdd={addCustom}
            onBack={() => setShowFallback(false)}
          />
        )}
        {step === 'name' && pendingVilla && (
          <NameStep
            villa={pendingVilla}
            name={name}
            submitting={submitting}
            onNameChange={setNameInput}
            onConfirm={confirmName}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
