'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'min-h-tap w-full rounded-xl border bg-card px-3 py-3 text-base appearance-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        'bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'><path fill=\'%2364748b\' d=\'M6 8 0 0h12z\'/></svg>")] bg-no-repeat bg-[right_0.75rem_center] pr-9',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
