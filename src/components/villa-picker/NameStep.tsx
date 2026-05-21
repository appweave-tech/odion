'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Villa } from '@/lib/types';

export function NameStep({
  villa,
  name,
  submitting,
  onNameChange,
  onConfirm,
  onBack,
}: {
  villa: Villa;
  name: string;
  submitting: boolean;
  onNameChange: (n: string) => void;
  onConfirm: () => void;
  // Back to the typeahead step. Clears the pending villa so a mistapped
  // selection doesn't trap the resident on the Name step with no escape
  // other than dismissing the whole sheet.
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3 pt-2">
      <p className="text-sm text-muted-foreground">
        You picked <span className="font-medium text-foreground">{villa.label}</span>. Your name shows up
        next to skips you report. Optional — leave blank to stay anonymous.
      </p>
      <Input
        autoFocus
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Your name (optional)"
      />
      <Button size="lg" disabled={submitting} onClick={onConfirm}>
        {submitting ? 'Saving…' : 'Confirm'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline min-h-10 disabled:opacity-50"
      >
        ← Pick a different villa
      </button>
    </div>
  );
}
