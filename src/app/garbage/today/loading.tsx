export default function Loading() {
  return (
    <div className="p-5 grid gap-6">
      <div className="grid gap-2">
        <div className="h-3 w-12 rounded bg-muted animate-pulse" />
        <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-2xl border bg-card">
        <div className="px-4 py-3 border-b">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="px-4 py-3 border-b">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="rounded-2xl bg-muted/40 h-32 animate-pulse" />
    </div>
  );
}
