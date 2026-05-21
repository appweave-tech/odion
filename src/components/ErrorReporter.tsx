'use client';

import * as React from 'react';
import { logError } from '@/lib/log-error';

// Global window listeners. Mounted once in the root layout so any uncaught
// throw or unhandled promise rejection ships to /api/log. App Router error
// boundaries call logError directly from their useEffect so we get both
// client-side runtime errors AND server-side errors that surfaced through
// the React boundary path.
//
// Self-throttled: dedupe identical messages within a short window so a
// runaway error in a render loop doesn't hammer /api/log (which itself has
// a server-side cap, but defence in depth helps).
export function ErrorReporter() {
  React.useEffect(() => {
    const recent = new Map<string, number>();
    const DEDUPE_WINDOW_MS = 5000;

    function shouldSend(key: string): boolean {
      const now = Date.now();
      const last = recent.get(key) ?? 0;
      if (now - last < DEDUPE_WINDOW_MS) return false;
      recent.set(key, now);
      // Periodic cleanup so the Map doesn't grow unbounded.
      if (recent.size > 32) {
        for (const [k, t] of recent) {
          if (now - t > DEDUPE_WINDOW_MS) recent.delete(k);
        }
      }
      return true;
    }

    function onError(e: ErrorEvent) {
      const msg = e.message || 'window error';
      if (!shouldSend(`window.error:${msg}`)) return;
      logError({
        kind: 'window.error',
        message: msg,
        stack: e.error instanceof Error ? e.error.stack : undefined,
      });
    }

    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'unhandled rejection';
      if (!shouldSend(`unhandledrejection:${msg}`)) return;
      logError({
        kind: 'unhandledrejection',
        message: msg,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
