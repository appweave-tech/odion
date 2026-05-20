'use client';

import * as React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { findOrCreateVilla, claimVilla, listPhases, listVillasInPhase } from '@/lib/actions/villas';
import { setVilla, setName, getName } from '@/lib/device';
import { toast } from 'sonner';
import type { Villa } from '@/lib/types';
import { PhaseStep } from './villa-picker/PhaseStep';
import { CustomAddStep } from './villa-picker/CustomAddStep';
import { NameStep } from './villa-picker/NameStep';

type Phase = { phase: string; count: number };

// sessionStorage key for in-flight picker draft. If a resident closes the
// sheet mid-flow (notification, swipe, mistap) reopening picks up where
// they left off rather than restarting from phase selection.
const DRAFT_KEY = 'odion:picker-draft';

type Draft = {
  step: 'pick' | 'name';
  showFallback: boolean;
  phase: string;
  number: string;
  newPhase: string;
  newNumber: string;
  pendingVilla: Villa | null;
};

const EMPTY_DRAFT: Draft = {
  step: 'pick',
  showFallback: false,
  phase: '',
  number: '',
  newPhase: '',
  newNumber: '',
  pendingVilla: null,
};

function loadDraft(): Draft {
  if (typeof window === 'undefined') return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

function saveDraft(d: Draft) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // sessionStorage full or disabled — non-fatal.
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function VillaPicker({
  trigger,
  onPicked,
}: {
  trigger: React.ReactNode;
  onPicked?: (v: Villa) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [name, setNameInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Lazily-fetched: the picker now owns its own data so /garbage doesn't
  // need to ship the full villa list on first paint.
  const [phases, setPhases] = React.useState<Phase[] | null>(null);
  const [villasInPhase, setVillasInPhase] = React.useState<Villa[]>([]);
  const [loadingPhases, setLoadingPhases] = React.useState(false);
  const [loadingVillas, setLoadingVillas] = React.useState(false);

  // Restore in-flight draft on first mount.
  React.useEffect(() => {
    setDraft(loadDraft());
  }, []);

  // Persist draft on change.
  React.useEffect(() => {
    if (draft === EMPTY_DRAFT) return;
    saveDraft(draft);
  }, [draft]);

  // Fetch phases on first open.
  React.useEffect(() => {
    if (!open || phases !== null) return;
    setLoadingPhases(true);
    listPhases()
      .then((p) => setPhases(p))
      .catch(() => toast.error('Could not load phases'))
      .finally(() => setLoadingPhases(false));
  }, [open, phases]);

  // Fetch villas in the selected phase on change.
  React.useEffect(() => {
    if (!draft.phase) {
      setVillasInPhase([]);
      return;
    }
    let cancelled = false;
    setLoadingVillas(true);
    listVillasInPhase(draft.phase)
      .then((v) => {
        if (!cancelled) setVillasInPhase(v);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load villa numbers');
      })
      .finally(() => {
        if (!cancelled) setLoadingVillas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.phase]);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    clearDraft();
  }

  function pickExisting() {
    if (!draft.phase || !draft.number) {
      toast.error('Pick phase and villa number');
      return;
    }
    const v = villasInPhase.find((x) => String(x.number) === draft.number);
    if (!v) {
      toast.error('Villa not found in this phase');
      return;
    }
    patch({ step: 'name', pendingVilla: v });
    setNameInput(getName());
  }

  async function addCustom() {
    const p = draft.newPhase.trim().toUpperCase();
    const n = Number(draft.newNumber);
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
      patch({ step: 'name', pendingVilla: villa });
      setNameInput(getName());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not add villa';
      toast.error(msg);
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmName() {
    if (!draft.pendingVilla) return;
    setSubmitting(true);
    try {
      await claimVilla(draft.pendingVilla.id, { name: name.trim() || undefined });
      setVilla(draft.pendingVilla.id, draft.pendingVilla.label);
      setName(name.trim());
      toast.success(`You're villa ${draft.pendingVilla.label}`);
      onPicked?.(draft.pendingVilla);
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
    draft.step === 'name'
      ? 'Your name (optional)'
      : draft.showFallback
        ? 'Add my villa'
        : 'Pick your villa';

  const description =
    draft.step === 'name'
      ? 'Optional display name shown next to skips you report.'
      : draft.showFallback
        ? 'Add a villa not in the list. Admin will verify it later.'
        : 'Choose your phase and villa number.';

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // Don't wipe the draft on close — sessionStorage keeps it so a
        // re-open resumes mid-flow. Only fully-successful claims call reset().
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={title} description={description}>
        {draft.step === 'pick' && !draft.showFallback && (
          <PhaseStep
            phases={phases ?? []}
            villasInPhase={villasInPhase}
            phase={draft.phase}
            number={draft.number}
            loadingPhases={loadingPhases}
            loadingVillas={loadingVillas}
            onPhaseChange={(p) => patch({ phase: p, number: '' })}
            onNumberChange={(n) => patch({ number: n })}
            onContinue={pickExisting}
            onOpenFallback={() => patch({ showFallback: true })}
          />
        )}
        {draft.step === 'pick' && draft.showFallback && (
          <CustomAddStep
            newPhase={draft.newPhase}
            newNumber={draft.newNumber}
            submitting={submitting}
            onNewPhaseChange={(p) => patch({ newPhase: p })}
            onNewNumberChange={(n) => patch({ newNumber: n })}
            onAdd={addCustom}
            onBack={() => patch({ showFallback: false })}
          />
        )}
        {draft.step === 'name' && draft.pendingVilla && (
          <NameStep
            villa={draft.pendingVilla}
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
