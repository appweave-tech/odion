'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { adminLogout } from '@/lib/actions/admin';
import { ingestChatExport, reclassifyAll } from '@/lib/actions/insights';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, RefreshCw, ExternalLink } from 'lucide-react';
import type { InsightsIngest } from '@/lib/types';

type Props = {
  last: InsightsIngest | null;
  overall: {
    total_messages: number;
    unique_senders: number;
    first_ts: string | null;
    last_ts: string | null;
    classified: number;
  };
  recent: InsightsIngest[];
};

export function InsightsAdmin({ last, overall, recent }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ingestChatExport(fd);
      toast.success(
        `Parsed ${res.parsed} · added ${res.inserted} new · classified ${res.classified}`,
      );
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Ingest failed');
      console.error(e);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onReclassify() {
    try {
      const n = await reclassifyAll();
      toast.success(`Re-classified ${n} messages`);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Re-classify failed');
    }
  }

  return (
    <div className="p-5 grid gap-4 max-w-3xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Insights · Admin</h1>
          <p className="text-sm text-muted-foreground">
            Upload the latest WhatsApp chat export to refresh the dashboard.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await adminLogout();
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </header>

      <FreshnessBanner last={last} />

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Messages" value={overall.total_messages} />
        <Stat label="Senders" value={overall.unique_senders} />
        <Stat label="Classified" value={overall.classified} />
        <Stat
          label="Span (days)"
          value={
            overall.first_ts && overall.last_ts
              ? Math.max(
                  1,
                  Math.round(
                    (new Date(overall.last_ts).getTime() -
                      new Date(overall.first_ts).getTime()) /
                      86400000,
                  ),
                )
              : 0
          }
        />
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <div className="flex items-center gap-2">
          <Upload className="size-5" />
          <h2 className="font-medium">Upload chat export</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          From WhatsApp: <span className="font-mono">RWA group → More → Export Chat → Without Media</span>.
          You can upload the <span className="font-mono">.zip</span> directly or the unzipped{' '}
          <span className="font-mono">_chat.txt</span>. New messages are de-duped automatically.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.txt,text/plain,application/zip"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
          className="text-sm"
        />
        {uploading && (
          <p className="text-sm text-muted-foreground">
            Parsing and classifying… large exports take ~20 seconds.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent ingests</h2>
          <Button variant="outline" size="sm" onClick={onReclassify}>
            <RefreshCw className="size-4" /> Re-classify all
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ingests yet.</p>
        ) : (
          <ul className="divide-y -mx-5">
            {recent.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.uploaded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {' '}
                    {r.parsed_count} parsed · {r.inserted_count} new
                  </div>
                </div>
                <span
                  className={
                    'text-[10px] uppercase rounded-full px-2 py-0.5 border ' +
                    (r.status === 'classified'
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : r.status === 'failed'
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-muted text-muted-foreground')
                  }
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/insights"
        className="rounded-2xl border bg-card p-5 flex items-center gap-3 min-h-tap active:bg-accent"
      >
        <div className="flex-1">
          <div className="font-medium">Open public dashboard</div>
          <div className="text-sm text-muted-foreground">/insights — what residents and RWA see</div>
        </div>
        <ExternalLink className="size-5 text-muted-foreground" />
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString('en-IN')}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FreshnessBanner({ last }: { last: InsightsIngest | null }) {
  if (!last) {
    return (
      <div className="rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
        No chat uploaded yet. Upload an export below to populate the dashboard.
      </div>
    );
  }
  const uploaded = new Date(last.uploaded_at);
  const chatLast = last.chat_last_ts ? new Date(last.chat_last_ts) : null;
  const hoursAgo = Math.round((Date.now() - uploaded.getTime()) / 3_600_000);
  const stale = hoursAgo > 30;
  return (
    <div
      className={
        'rounded-2xl border p-4 text-sm grid gap-1 ' +
        (stale ? 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/30' : 'bg-card')
      }
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">Last updated</span>
        <span className="text-xs text-muted-foreground">
          {uploaded.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {hoursAgo < 1 ? 'Just now' : `${hoursAgo}h ago`}
        {chatLast && (
          <>
            {' · '}chat reaches{' '}
            {chatLast.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </>
        )}
      </div>
    </div>
  );
}
