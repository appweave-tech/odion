'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from './NativeSelect';
import type { Villa } from '@/lib/types';

type Phase = { phase: string; count: number };

export function PhaseStep({
  phases,
  villasInPhase,
  phase,
  number,
  onPhaseChange,
  onNumberChange,
  onContinue,
  onOpenFallback,
}: {
  phases: Phase[];
  villasInPhase: Villa[];
  phase: string;
  number: string;
  onPhaseChange: (p: string) => void;
  onNumberChange: (n: string) => void;
  onContinue: () => void;
  onOpenFallback: () => void;
}) {
  return (
    <div className="grid gap-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">Phase</span>
          <NativeSelect value={phase} onChange={(e) => onPhaseChange(e.target.value)}>
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
            onChange={(e) => onNumberChange(e.target.value)}
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
      <Button size="lg" onClick={onContinue} disabled={!phase || !number}>
        Continue
      </Button>
      <button
        type="button"
        className="text-sm text-primary underline-offset-4 hover:underline min-h-10"
        onClick={onOpenFallback}
      >
        Can't find my villa →
      </button>
    </div>
  );
}
