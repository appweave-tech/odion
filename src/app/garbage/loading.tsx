export default function Loading() {
  return (
    <div className="p-5 grid gap-6">
      <div className="grid gap-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-7 w-20 rounded bg-muted animate-pulse" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-20 rounded-2xl bg-muted animate-pulse" />
      <div className="grid gap-2">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-12 rounded-xl bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}
