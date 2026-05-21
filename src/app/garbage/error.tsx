'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/log-error';

export default function GarbageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[odion:garbage:error]', error);
    logError({
      kind: 'rsc.boundary',
      message: error.message || 'garbage error boundary',
      digest: error.digest,
      stack: error.stack,
      ctx: { boundary: 'garbage' },
    });
  }, [error]);

  return (
    <div className="p-5 grid gap-4">
      <header>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Garbage</div>
        <h1 className="text-2xl font-semibold">Couldn't load this page</h1>
      </header>
      <p className="text-sm text-muted-foreground">
        Something went wrong on our side. Your marks are safe — try again.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">ref: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/garbage">Home</a>
        </Button>
      </div>
    </div>
  );
}
