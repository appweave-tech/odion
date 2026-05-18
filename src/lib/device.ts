'use client';

// Device identity is held server-side as an httpOnly cookie set by middleware.
// This module only handles UI-state that the client legitimately needs:
// the user's chosen villa (for fast initial render) and their display name.

const VILLA_KEY = 'odion:villa_id';
const VILLA_LABEL_KEY = 'odion:villa_label';
const NAME_KEY = 'odion:resident_name';

export function getVilla(): { id: string; label: string } | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(VILLA_KEY);
  const label = localStorage.getItem(VILLA_LABEL_KEY);
  return id && label ? { id, label } : null;
}

export function setVilla(id: string, label: string) {
  localStorage.setItem(VILLA_KEY, id);
  localStorage.setItem(VILLA_LABEL_KEY, label);
}

export function clearVilla() {
  localStorage.removeItem(VILLA_KEY);
  localStorage.removeItem(VILLA_LABEL_KEY);
}

export function getName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setName(name: string) {
  if (name) localStorage.setItem(NAME_KEY, name);
  else localStorage.removeItem(NAME_KEY);
}
