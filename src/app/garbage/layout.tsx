import { GarbageNav } from './_nav';

export default function GarbageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur px-4 py-3">
        <a href="/" className="block">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Odion</div>
          <div className="text-base font-semibold">Garbage Tracker</div>
        </a>
      </header>
      <main className="flex-1">{children}</main>
      <GarbageNav />
      <footer className="px-5 py-4 text-[11px] text-muted-foreground text-center">
        Built By{' '}
        <a className="underline" href="https://appweave.tech" target="_blank" rel="noreferrer">
          Appweave
        </a>{' '}
        — Community Ops Tools.
      </footer>
    </div>
  );
}
