import Link from 'next/link';
import { Trash2, BarChart3, ArrowRight } from 'lucide-react';

function ModuleCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-card p-5 active:scale-[0.98] transition flex items-center gap-4 min-h-tap hover:bg-accent/40"
    >
      <span aria-hidden className="text-foreground/80 shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <ArrowRight aria-hidden className="size-4 text-muted-foreground shrink-0" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col max-w-md mx-auto w-full">
      <header className="px-5 pt-10 pb-6">
        <p className="text-sm text-muted-foreground">Welcome to</p>
        <h1 className="text-3xl font-semibold tracking-tight">Odion · The Woods of East</h1>
        <p className="mt-2 text-sm text-muted-foreground">Community ops, one module at a time.</p>
      </header>
      <section className="px-5 grid gap-3">
        <ModuleCard
          href="/garbage"
          icon={<Trash2 className="size-6" />}
          title="Garbage Pickup Tracker"
          subtitle="Log skipped collections, see history."
        />
        <ModuleCard
          href="/insights"
          icon={<BarChart3 className="size-6" />}
          title="Community Insights"
          subtitle="What the RWA group is talking about — auto-classified."
        />
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
