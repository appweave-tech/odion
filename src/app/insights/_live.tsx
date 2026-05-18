import type { LiveIssue } from '@/lib/types';

export function LiveIssuesList({ items }: { items: LiveIssue[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing flagged this week. Either things are calm or the chat hasn't caught up yet.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {items.map((it) => {
        const last = new Date(it.last_ts);
        const hoursAgo = Math.max(1, Math.round((Date.now() - last.getTime()) / 3_600_000));
        return (
          <li
            key={it.category}
            className="rounded-xl border p-3"
            style={{ borderColor: (it.color ?? '#94a3b8') + '40' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{it.emoji}</span>
                <span className="font-medium">{it.label}</span>
                <span
                  className="rounded-full text-[10px] px-2 py-0.5 text-white"
                  style={{ background: it.color ?? '#94a3b8' }}
                >
                  {it.recent_count} msgs · {it.unique_senders} residents
                </span>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
