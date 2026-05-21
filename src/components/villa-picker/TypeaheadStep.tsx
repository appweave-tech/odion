'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import type { Villa } from '@/lib/types';

// Single typeahead replaces the two-dropdown PhaseStep. The full villa list
// (~115 rows) is ~9KB once fetched — paid once per session, not per render.
// Filter is case-insensitive, matches anywhere in the label (so "35" finds
// every P*-35 and "P1" finds every P1-*).
//
// Layout note: the results grid is sized to a fixed 42dvh whether empty,
// loading, or full. Reserving the space keeps the sheet from auto-growing
// upward when villas finish loading — a tap on the input mid-load would
// otherwise land on whichever card just slid into that position.
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

      {/* Fixed-height results region. The grid always reserves the same
          vertical space so the sheet doesn't grow upward when villas
          finish loading and a mid-air tap doesn't land on a card. */}
      <div className="h-[42dvh] overflow-y-auto pr-1" role="listbox" aria-label="Villa matches">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Loading villas…
          </div>
        ) : matches.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground px-4">
            No villa matches "{query}". Try the fallback below.
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
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
          </ul>
        )}
      </div>

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
