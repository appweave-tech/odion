export default function Loading() {
  return (
    <div className="p-5 grid gap-6">
      <div className="grid gap-2">
        <div className="h-3 w-12 rounded bg-muted animate-pulse" />
        <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-2xl border bg-card p-4 h-40 animate-pulse" />
      <div className="grid gap-2">
        <div className="h-16 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-16 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-16 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}
