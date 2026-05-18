'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CustomAddStep({
  newPhase,
  newNumber,
  submitting,
  onNewPhaseChange,
  onNewNumberChange,
  onAdd,
  onBack,
}: {
  newPhase: string;
  newNumber: string;
  submitting: boolean;
  onNewPhaseChange: (p: string) => void;
  onNewNumberChange: (n: string) => void;
  onAdd: () => void;
  onBack: () => void;
}) {
  return (
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
          onChange={(e) => onNewPhaseChange(e.target.value)}
          placeholder="P1"
          autoCapitalize="characters"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-muted-foreground">Villa number</span>
        <Input
          autoComplete="off"
          value={newNumber}
          onChange={(e) => onNewNumberChange(e.target.value.replace(/\D/g, ''))}
          placeholder="35"
          inputMode="numeric"
          pattern="[0-9]*"
        />
      </label>
      <Button size="lg" onClick={onAdd} disabled={submitting}>
        {submitting ? 'Adding…' : 'Add my villa'}
      </Button>
      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline min-h-10"
        onClick={onBack}
      >
        ← Back to phase list
      </button>
    </div>
  );
}
