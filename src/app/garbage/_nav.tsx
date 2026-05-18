'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, History, Home, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/garbage', label: 'Home', icon: Home },
  { href: '/garbage/today', label: 'Today', icon: CalendarDays },
  { href: '/garbage/history', label: 'History', icon: History },
  { href: '/garbage/settings', label: 'Settings', icon: Settings },
];

export function GarbageNav() {
  const pathname = usePathname();
  // Optimistic active tab: when user taps, set this immediately for instant feedback
  // even before the server-rendered page arrives.
  const [optimistic, setOptimistic] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Once the new URL matches what we optimistically picked, clear the override.
    if (optimistic === pathname) setOptimistic(null);
  }, [pathname, optimistic]);

  const active = optimistic ?? pathname;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {TABS.map((t) => {
          const isActive =
            t.href === '/garbage'
              ? active === '/garbage'
              : active === t.href || active.startsWith(t.href + '/');
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                prefetch
                onClick={() => setOptimistic(t.href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 min-h-tap text-[11px] transition-colors',
                  'active:bg-accent',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
