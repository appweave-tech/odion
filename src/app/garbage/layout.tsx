import { GarbageNav } from './_nav';
import { GarbageHeader } from './_header';

export default function GarbageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col pb-[calc(96px+env(safe-area-inset-bottom))]">
      <GarbageHeader />
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
