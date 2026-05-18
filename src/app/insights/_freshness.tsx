'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';

export function FreshnessChip({
  uploadedAt,
  chatLastTs,
}: {
  uploadedAt: string;
  chatLastTs: string | null;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const uploaded = new Date(uploadedAt);
  const hours = Math.max(0, (now - uploaded.getTime()) / 3_600_000);
  const stale = hours > 30;
  const rel =
    hours < 1
      ? `${Math.max(1, Math.round(hours * 60))}m ago`
      : hours < 48
        ? `${Math.round(hours)}h ago`
        : `${Math.round(hours / 24)}d ago`;

  return (
    <div
      className={
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ' +
        (stale
          ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200'
          : 'bg-muted text-muted-foreground')
      }
      title={`Uploaded: ${uploaded.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\nChat reaches: ${chatLastTs ? new Date(chatLastTs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}`}
    >
      <Clock className="size-3.5" />
      <span>
        Updated {rel}
        {chatLastTs && (
          <>
            {' '}· chat through{' '}
            {new Date(chatLastTs).toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: 'short',
            })}
          </>
        )}
      </span>
    </div>
  );
}
