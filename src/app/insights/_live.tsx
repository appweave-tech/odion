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
            className="rounded-xl border p-4"
            style={{ borderColor: (it.color ?? '#94a3b8') + '40' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden>
                {it.emoji}
              </span>
              <div className="flex-1 min-w-0 grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-base truncate">{it.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full text-xs px-2 py-0.5 text-white font-medium"
                    style={{ background: it.color ?? '#94a3b8' }}
                  >
                    {it.recent_count} msg{it.recent_count === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {it.unique_senders} resident{it.unique_senders === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
