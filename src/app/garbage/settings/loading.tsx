export default function Loading() {
  return (
    <div className="p-5 grid gap-6">
      <div className="grid gap-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-7 w-36 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-2xl border bg-card p-5 h-32 animate-pulse" />
      <div className="rounded-2xl border bg-card p-5 h-32 animate-pulse" />
    </div>
  );
}
