'use client';

const DEVICE_KEY = 'odion:device_id';
const VILLA_KEY = 'odion:villa_id';
const VILLA_LABEL_KEY = 'odion:villa_label';
const NAME_KEY = 'odion:resident_name';

function uuid4(): string {
  // crypto.randomUUID is only available in secure contexts (HTTPS or localhost).
  // Phones hitting the LAN IP over plain http get a non-secure context, where
  // randomUUID is undefined. crypto.getRandomValues works in any context.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = uuid4();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
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
