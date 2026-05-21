'use client';

// Client-side error logger. POSTs to /api/log; intentionally fire-and-forget
// so a logging failure can never escalate into a worse user experience.
// Server-side code calls the API route directly from error boundaries.

type LogPayload = {
  kind: 'window.error' | 'unhandledrejection' | 'rsc.boundary' | 'api';
  message: string;
  level?: 'error' | 'warning';
  digest?: string;
  stack?: string;
  url?: string;
  ctx?: Record<string, unknown>;
};

// Best-effort POST. `keepalive` lets the request finish even if the page is
// unloading (e.g. user navigating away mid-error). Any failure is swallowed
// — a broken /api/log must never break the page reporting an error.
export function logError(payload: LogPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const body: LogPayload = {
      ...payload,
      url: payload.url ?? window.location.href,
    };
    void fetch('/api/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
