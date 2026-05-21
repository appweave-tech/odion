'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Villa } from '@/lib/types';

// Single typeahead replaces the two-dropdown PhaseStep. The full villa list
// (~115 rows) is ~9KB once fetched — paid once per session, not per render.
// Filter is case-insensitive, matches anywhere in the label (so "35" finds
// every P*-35 and "P1" finds every P1-*).
const MAX_VISIBLE = 30;

export function TypeaheadStep({
  villas,
  loading,
  query,
  onQueryChange,
  onSelect,
  onOpenFallback,
}: {
  villas: Villa[];
  loading: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (v: Villa) => void;
  onOpenFallback: () => void;
}) {
  const normalized = query.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!normalized) return villas.slice(0, MAX_VISIBLE);
    return villas
      .filter((v) => v.label.toLowerCase().includes(normalized))
      .slice(0, MAX_VISIBLE);
  }, [villas, normalized]);

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (matches.length === 0) return;
    e.preventDefault();
    onSelect(matches[0]);
  }

  return (
    <div className="grid gap-3 pt-2">
      <label className="grid gap-1">
        <span className="text-sm text-muted-foreground">Search by villa label</span>
        <Input
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onEnter}
          placeholder="e.g. P1-35"
          aria-label="Type your villa label"
        />
      </label>

      <div className="text-xs text-muted-foreground">
        {loading
          ? 'Loading villas…'
          : normalized
            ? `${matches.length} match${matches.length === 1 ? '' : 'es'}`
            : `${villas.length} villas — type to filter`}
      </div>

      <ul
        className={cn(
          'grid grid-cols-3 gap-2 max-h-[42dvh] overflow-y-auto pr-1',
          loading && 'opacity-50 pointer-events-none',
        )}
        role="listbox"
        aria-label="Villa matches"
      >
        {matches.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onSelect(v)}
              className="w-full min-h-tap rounded-xl border bg-card px-2.5 py-2.5 text-base font-medium tabular-nums active:bg-accent transition"
            >
              {v.label}
            </button>
          </li>
        ))}
        {!loading && matches.length === 0 && (
          <li className="col-span-3 text-center text-sm text-muted-foreground py-6">
            No villa matches "{query}". Try the fallback below.
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={onOpenFallback}
        className="text-sm text-primary underline-offset-4 hover:underline min-h-10"
      >
        Can't find my villa →
      </button>
    </div>
  );
}
