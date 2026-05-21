'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { findOrCreateVilla, claimVilla, listVillas } from '@/lib/actions/villas';
import { setVilla, setName, getName, getVilla } from '@/lib/device';
import { toast } from 'sonner';
import type { Villa } from '@/lib/types';
import { TypeaheadStep } from './villa-picker/TypeaheadStep';
import { CustomAddStep } from './villa-picker/CustomAddStep';
import { NameStep } from './villa-picker/NameStep';

// sessionStorage key for in-flight picker draft. If a resident closes the
// sheet mid-flow (notification, swipe, mistap) reopening picks up where
// they left off rather than restarting.
const DRAFT_KEY = 'odion:picker-draft';
// History-push state marker: lets us tell our own pushState entry from any
// other navigation when handling popstate to close the sheet.
const HISTORY_MARKER = '__odion_picker_open';

type Draft = {
  step: 'pick' | 'name';
  showFallback: boolean;
  query: string;
  newPhase: string;
  newNumber: string;
  pendingVilla: Villa | null;
};

const EMPTY_DRAFT: Draft = {
  step: 'pick',
  showFallback: false,
  query: '',
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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [name, setNameInput] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Full villa list — fetched once per session on first open. ~9KB once.
  const [villas, setVillas] = React.useState<Villa[] | null>(null);
  const [loadingVillas, setLoadingVillas] = React.useState(false);

  // Restore in-flight draft on first mount — but only for residents who
  // haven't yet claimed a villa. Resume-mid-flow exists to help first-time
  // pickers who got interrupted, not returning residents using "Change
  // villa" (who'd otherwise land on a stale Name step for some other villa).
  React.useEffect(() => {
    if (getVilla()) {
      clearDraft();
      return;
    }
    setDraft(loadDraft());
  }, []);

  // Persist draft on change.
  React.useEffect(() => {
    if (draft === EMPTY_DRAFT) return;
    saveDraft(draft);
  }, [draft]);

  // Fetch the villa list on first open.
  React.useEffect(() => {
    if (!open || villas !== null) return;
    setLoadingVillas(true);
    listVillas()
      .then((v) => setVillas(v))
      .catch(() => toast.error('Could not load villas'))
      .finally(() => setLoadingVillas(false));
  }, [open, villas]);

  // History-push integration: when the sheet opens, push a marker entry so
  // Android's system back gesture (and any browser back) pops the sheet
  // instead of leaving the app. When closing via UI we step the history
  // back so our pushed entry doesn't accumulate.
  React.useEffect(() => {
    if (!open) return;
    const state = (window.history.state as Record<string, unknown> | null) ?? {};
    if (!state[HISTORY_MARKER]) {
      window.history.pushState({ ...state, [HISTORY_MARKER]: true }, '');
    }
    function onPop() {
      // Any popstate while we're open = back button → close the sheet.
      setOpen(false);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next && open) {
      // Closing via UI (X / overlay / Escape). If our pushed history entry
      // is still on top, step back so we don't leave a phantom entry behind.
      const state = (window.history.state as Record<string, unknown> | null) ?? {};
      if (state[HISTORY_MARKER]) {
        window.history.back();
      } else {
        setOpen(false);
      }
      return;
    }
    setOpen(next);
  }

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function reset() {
    setDraft(EMPTY_DRAFT);
    clearDraft();
  }

  function selectVilla(v: Villa) {
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
      selectVilla(villa);
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
      handleOpenChange(false);
      reset();
      // Re-fetch the layout's villa chip and any other RSC that reads the
      // device claim. The picker can be called from /garbage or /settings;
      // both need their server tree refreshed so the chip appears.
      router.refresh();
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
        : 'Type your villa label to find it.';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent title={title} description={description}>
        {draft.step === 'pick' && !draft.showFallback && (
          <TypeaheadStep
            villas={villas ?? []}
            loading={loadingVillas}
            query={draft.query}
            onQueryChange={(q) => patch({ query: q })}
            onSelect={selectVilla}
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
            onBack={() => patch({ step: 'pick', pendingVilla: null })}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
