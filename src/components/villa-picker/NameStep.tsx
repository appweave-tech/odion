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
}: {
  villa: Villa;
  name: string;
  submitting: boolean;
  onNameChange: (n: string) => void;
  onConfirm: () => void;
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
    </div>
  );
}
