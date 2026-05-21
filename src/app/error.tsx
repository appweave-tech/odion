'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/log-error';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[odion:error]', error);
    logError({
      kind: 'rsc.boundary',
      message: error.message || 'root error boundary',
      digest: error.digest,
      stack: error.stack,
      ctx: { boundary: 'root' },
    });
  }, [error]);

  return (
    <div className="p-5 grid gap-4 max-w-md mx-auto pt-12">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We hit a snag loading this page. Try again in a moment.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">ref: {error.digest}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/garbage">Back to home</a>
        </Button>
      </div>
    </div>
  );
}
