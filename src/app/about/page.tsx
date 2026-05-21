import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="flex-1 px-5 py-8 grid gap-6 max-w-md mx-auto">
      <header>
        <Link href="/" className="text-xs uppercase tracking-wider text-muted-foreground">
          ← Odion
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">About</h1>
      </header>
      <section className="grid gap-3 text-sm leading-relaxed">
        <p>
          <strong>Odion Community Ops</strong> is a small set of tools built for residents of{' '}
          <em>Odion The Woods of East</em>, Chikkanayakanahalli, Bangalore.
        </p>
        <p>
          The first module is the <strong>Garbage Pickup Tracker</strong> — a way for residents to log when their villa got
          skipped by the BBMP van, so the RWA has data to escalate. Future modules will cover maintenance, dues, and
          events.
        </p>
        <p className="text-muted-foreground">
          No login, no tracking. Your villa selection lives on your device. Names are optional. Skip events are
          visible to the community.
        </p>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <div className="text-sm font-medium">Built By Appweave</div>
        <p className="mt-1 text-sm text-muted-foreground">
          We build internal tools, ML pipelines, and community ops apps from Bangalore.
        </p>
        <a className="mt-3 inline-block underline" href="https://appweave.tech" target="_blank" rel="noreferrer">
          appweave.tech →
        </a>
      </section>
    </main>
  );
}
