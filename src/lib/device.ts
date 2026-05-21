'use client';

// Device identity is held server-side as an httpOnly cookie set by middleware.
// This module only handles UI-state that the client legitimately needs:
// the user's chosen villa (for fast initial render) and their display name.

const VILLA_KEY = 'odion:villa_id';
const VILLA_LABEL_KEY = 'odion:villa_label';
const NAME_KEY = 'odion:resident_name';

// Custom event fired in-tab whenever the device's villa changes (set or cleared).
// `storage` events fire across tabs but NOT the tab that wrote — so UI in the
// same tab (header chip etc.) needs an in-tab signal too.
export const VILLA_CHANGED_EVENT = 'odion:villa-changed';

function emitVillaChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(VILLA_CHANGED_EVENT));
}

export function getVilla(): { id: string; label: string } | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(VILLA_KEY);
  const label = localStorage.getItem(VILLA_LABEL_KEY);
  return id && label ? { id, label } : null;
}

export function setVilla(id: string, label: string) {
  localStorage.setItem(VILLA_KEY, id);
  localStorage.setItem(VILLA_LABEL_KEY, label);
  emitVillaChanged();
}

export function clearVilla() {
  localStorage.removeItem(VILLA_KEY);
  localStorage.removeItem(VILLA_LABEL_KEY);
  emitVillaChanged();
}

export function getName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setName(name: string) {
  if (name) localStorage.setItem(NAME_KEY, name);
  else localStorage.removeItem(NAME_KEY);
}

// React hook for components that need to react to villa changes (set, clear,
// or cross-tab via storage). Returns the current villa or null.
import * as React from 'react';

export function useVilla(): { id: string; label: string } | null {
  const [villa, setVillaState] = React.useState<{ id: string; label: string } | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setVillaState(getVilla());
    setHydrated(true);
    function refresh() {
      setVillaState(getVilla());
    }
    window.addEventListener(VILLA_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(VILLA_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return hydrated ? villa : null;
}
