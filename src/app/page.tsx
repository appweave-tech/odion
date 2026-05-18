import Link from 'next/link';
import { Trash2, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="px-5 pt-10 pb-6">
        <p className="text-sm text-muted-foreground">Welcome to</p>
        <h1 className="text-3xl font-semibold tracking-tight">Odion · The Woods of East</h1>
        <p className="mt-2 text-sm text-muted-foreground">Community ops, one module at a time.</p>
      </header>
      <section className="px-5 grid gap-3">
        <Link
          href="/garbage"
          className="rounded-2xl border bg-card p-5 active:scale-[0.98] transition flex items-center gap-4 min-h-tap"
        >
          <div className="rounded-xl bg-primary/10 text-primary p-3">
            <Trash2 className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Garbage Tracker</div>
            <div className="text-sm text-muted-foreground">Log skipped collections, see history.</div>
          </div>
          <span className="text-muted-foreground">→</span>
        </Link>
        <Link
          href="/insights"
          className="rounded-2xl border bg-card p-5 active:scale-[0.98] transition flex items-center gap-4 min-h-tap"
        >
          <div className="rounded-xl bg-indigo-500/10 text-indigo-600 p-3">
            <BarChart3 className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Community Insights</div>
            <div className="text-sm text-muted-foreground">
              What the RWA group is talking about — auto-classified.
            </div>
          </div>
          <span className="text-muted-foreground">→</span>
        </Link>
        <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
          More modules coming soon — maintenance, dues, events.
        </div>
      </section>
      <footer className="mt-auto px-5 py-8 text-xs text-muted-foreground text-center">
        Built By{' '}
        <a className="underline" href="https://appweave.tech" target="_blank" rel="noreferrer">
          Appweave
        </a>{' '}
        — Community Ops Tools.
      </footer>
    </main>
  );
}
