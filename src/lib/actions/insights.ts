'use server';

import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/actions/admin';
import { parseWhatsAppChat, type ParsedMessage } from '@/lib/parse/whatsapp';
import { classify } from '@/lib/classify/insights';
import type {
  CategoryPulse,
  CategoryStat,
  InsightsIngest,
} from '@/lib/types';
import { revalidatePath } from 'next/cache';
import JSZip from 'jszip';

// Cap on zipped + unzipped content. The 10mb body limit (next.config.mjs) bounds upload;
// these bound the *expansion* so a zip-bomb can't OOM the Node process.
const MAX_ZIP_ENTRIES = 100;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MiB

async function extractChatText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const isZip = file.name.toLowerCase().endsWith('.zip') || buf.slice(0, 2).toString() === 'PK';
  if (!isZip) return buf.toString('utf8');

  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`Zip has too many entries (${entries.length} > ${MAX_ZIP_ENTRIES})`);
  }
  // JSZip exposes `_data.uncompressedSize` for compressed entries; sum what we know.
  let total = 0;
  for (const e of entries) {
    const size = (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof size === 'number') total += size;
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new Error(`Zip uncompressed payload too large (> ${MAX_UNCOMPRESSED_BYTES} bytes)`);
    }
  }

  const entry =
    zip.file(/_chat\.txt$/i)[0] ??
    zip.file(/chat\.txt$/i)[0] ??
    zip.file(/\.txt$/i)[0];
  if (!entry) throw new Error('No _chat.txt found in zip');
  return entry.async('string');
}

function sanitizeFilename(name: string): string {
  // Strip ASCII control chars + RTL/LTR override characters that mangle admin UI display.
  return name.replace(/[\x00-\x1f‪-‮]/g, '').slice(0, 255);
}

export async function ingestChatExport(formData: FormData): Promise<{
  ingest_id: string;
  parsed: number;
  inserted: number;
  classified: number;
}> {
  await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('No file uploaded');

  const text = await extractChatText(file);
  const messages = parseWhatsAppChat(text);
  if (messages.length === 0) throw new Error('Parsed 0 messages — unexpected format?');

  const first = messages[0].ts;
  const last = messages[messages.length - 1].ts;
  const cleanName = sanitizeFilename(file.name);

  // Transactional: ingest row + messages + status update land together or not at all.
  // Reclassify runs on the same tx so the per-ingest count is accurate and a crash mid-flight
  // can't leave 'parsed' rows orphaned.
  const result = await sql().begin(async (tx) => {
    const [ingest] = await tx<{ id: string }[]>`
      INSERT INTO odion.insights_ingests
        (filename, raw_size_bytes, parsed_count, chat_first_ts, chat_last_ts, status)
      VALUES (${cleanName}, ${file.size}, ${messages.length}, ${first}, ${last}, 'parsed')
      RETURNING id
    `;

    const inserted = await insertMessagesTx(tx, messages, ingest.id);
    const classified = await classifyPendingMessagesTx(tx);

    await tx`
      UPDATE odion.insights_ingests
         SET inserted_count = ${inserted},
             classified_count = ${classified},
             status = 'classified'
       WHERE id = ${ingest.id}
    `;
    return { ingest_id: ingest.id, inserted, classified };
  });

  revalidatePath('/insights');
  revalidatePath('/insights/admin');

  return {
    ingest_id: result.ingest_id,
    parsed: messages.length,
    inserted: result.inserted,
    classified: result.classified,
  };
}

// Inside a `begin` callback the parameter is the same template-tagged function as `sql()` —
// just narrowed by postgres.js. We accept the structural shape (TS infers it from the call site).
// Using `any` here is a deliberate concession to the postgres.js types; runtime is identical.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

async function insertMessagesTx(tx: Tx, messages: ParsedMessage[], ingestId: string): Promise<number> {
  if (messages.length === 0) return 0;

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const slice = messages.slice(i, i + BATCH);
    const rows = slice.map((m) => ({
      ts: m.ts,
      sender: m.sender,
      body: m.body,
      content_hash: m.content_hash,
      ingest_id: ingestId,
    }));
    const result = await tx`
      INSERT INTO odion.insights_messages
        ${tx(rows, 'ts', 'sender', 'body', 'content_hash', 'ingest_id')}
      ON CONFLICT (content_hash) DO NOTHING
      RETURNING id
    `;
    inserted += result.length;
  }
  return inserted;
}

// Cursor-batched classifier: never load the whole table into memory.
// Holds an advisory lock so a concurrent reclassify can't double-write.
const RECLASSIFY_LOCK_ID = 7340172; // arbitrary constant — `select pg_advisory_xact_lock`
const CLASSIFY_BATCH = 500;

async function classifyPendingMessagesTx(tx: Tx): Promise<number> {
  await tx`SELECT pg_advisory_xact_lock(${RECLASSIFY_LOCK_ID})`;
  let total = 0;
  // Cursor pattern: pull a batch, classify, write, repeat until no rows.
  while (true) {
    const rows = await tx<{ id: string; body: string }[]>`
      SELECT id, body FROM odion.insights_messages
       WHERE classified_at IS NULL
       ORDER BY id
       LIMIT ${CLASSIFY_BATCH}
    `;
    if (rows.length === 0) break;
    const ids: string[] = [];
    const cats: string[] = [];
    const intents: string[] = [];
    const phases: (string | null)[] = [];
    for (const r of rows) {
      const c = classify(r.body);
      ids.push(r.id);
      cats.push(c.category);
      intents.push(c.intent);
      phases.push(c.phase);
    }
    await tx`
      UPDATE odion.insights_messages AS m
         SET category = v.category,
             intent = v.intent,
             phase = v.phase,
             classified_at = now()
        FROM unnest(
               ${ids}::uuid[],
               ${cats}::text[],
               ${intents}::text[],
               ${phases}::text[]
             ) AS v(id, category, intent, phase)
       WHERE m.id = v.id
    `;
    total += rows.length;
  }
  return total;
}

export async function reclassifyAll(): Promise<number> {
  await requireAdmin();
  // Single transaction holds the advisory lock through nulling + reclassifying,
  // so a concurrent ingest can't race-classify the same rows.
  return sql().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${RECLASSIFY_LOCK_ID})`;
    await tx`UPDATE odion.insights_messages SET classified_at = NULL`;
    return classifyPendingMessagesTx(tx);
  });
}

// -------- Read APIs --------

export async function getLastIngest(): Promise<InsightsIngest | null> {
  const rows = await sql()<InsightsIngest[]>`
    SELECT id, filename, uploaded_at, raw_size_bytes, parsed_count, inserted_count,
           classified_count, chat_first_ts, chat_last_ts, status, error
      FROM odion.insights_ingests
     ORDER BY uploaded_at DESC
     LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getRecentIngests(limit = 10): Promise<InsightsIngest[]> {
  return sql()<InsightsIngest[]>`
    SELECT id, filename, uploaded_at, raw_size_bytes, parsed_count, inserted_count,
           classified_count, chat_first_ts, chat_last_ts, status, error
      FROM odion.insights_ingests
     ORDER BY uploaded_at DESC
     LIMIT ${limit}
  `;
}

export async function getCategoryStats(): Promise<CategoryStat[]> {
  return sql()<CategoryStat[]>`
    SELECT c.key      AS category,
           c.label    AS label,
           c.emoji    AS emoji,
           c.color    AS color,
           COALESCE(t.total, 0)::int       AS total,
           COALESCE(t.last30, 0)::int      AS last30,
           COALESCE(t.last7, 0)::int       AS last7,
           COALESCE(t.complaints7, 0)::int AS complaints7
      FROM odion.insights_categories c
      LEFT JOIN (
        SELECT category,
               COUNT(*)                                                       AS total,
               COUNT(*) FILTER (WHERE ts > now() - interval '30 days')        AS last30,
               COUNT(*) FILTER (WHERE ts > now() - interval '7 days')         AS last7,
               COUNT(*) FILTER (WHERE ts > now() - interval '7 days'
                                  AND intent = 'complaint')                   AS complaints7
          FROM odion.insights_messages
         WHERE category IS NOT NULL
         GROUP BY category
      ) t ON t.category = c.key
     ORDER BY c.display_order
  `;
}

type CategoryAggRow = Omit<CategoryPulse, 'daily_counts'>;
type DailyRow = { category: string; day: string; n: number };

export async function getCategoryPulse(): Promise<CategoryPulse[]> {
  // Per-category aggregates. "pill_count" mirrors the prior live-issues filter
  // (complaint+question, last 7d) so the heat pill stays an actionable signal.
  // "last7" stays total weekly volume so the delta line tells the broader story.
  const agg = await sql()<CategoryAggRow[]>`
    SELECT c.key   AS category,
           c.label AS label,
           c.emoji AS emoji,
           c.color AS color,
           COALESCE(t.total, 0)::int             AS total,
           COALESCE(t.last30, 0)::int            AS last30,
           COALESCE(t.last7, 0)::int             AS last7,
           COALESCE(t.pill_count, 0)::int        AS pill_count,
           COALESCE(t.unique_senders_7d, 0)::int AS unique_senders_7d,
           t.last_ts                             AS last_ts
      FROM odion.insights_categories c
      LEFT JOIN (
        SELECT category,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE ts > now() - interval '30 days') AS last30,
               COUNT(*) FILTER (WHERE ts > now() - interval '7 days')  AS last7,
               COUNT(*) FILTER (
                 WHERE ts > now() - interval '7 days'
                   AND intent IN ('complaint', 'question')
               ) AS pill_count,
               COUNT(DISTINCT sender) FILTER (
                 WHERE ts > now() - interval '7 days'
                   AND intent IN ('complaint', 'question')
               ) AS unique_senders_7d,
               MAX(ts) FILTER (
                 WHERE ts > now() - interval '7 days'
                   AND intent IN ('complaint', 'question')
               ) AS last_ts
          FROM odion.insights_messages
         WHERE category IS NOT NULL
         GROUP BY category
      ) t ON t.category = c.key
     WHERE c.key <> 'community'
     ORDER BY c.display_order
  `;

  const daily = await sql()<DailyRow[]>`
    SELECT category,
           to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day,
           COUNT(*)::int                                AS n
      FROM odion.insights_messages
     WHERE ts > now() - interval '30 days'
       AND category IS NOT NULL
       AND category <> 'community'
     GROUP BY category, day
  `;

  const dayKeys: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const dayIndex: Record<string, number> = {};
  dayKeys.forEach((k, i) => (dayIndex[k] = i));

  const series: Record<string, number[]> = {};
  for (const row of agg) series[row.category] = Array(30).fill(0);
  for (const r of daily) {
    const arr = series[r.category];
    if (!arr) continue;
    const idx = dayIndex[r.day];
    if (idx === undefined) continue;
    arr[idx] = r.n;
  }

  return agg
    .filter((a) => a.total > 0)
    .map((a) => ({ ...a, daily_counts: series[a.category] ?? Array(30).fill(0) }));
}

export async function getTopContributors(limit = 8): Promise<{ sender: string; count: number }[]> {
  return sql()<{ sender: string; count: number }[]>`
    SELECT sender, COUNT(*)::int AS count
      FROM odion.insights_messages
     WHERE ts > now() - interval '30 days'
     GROUP BY sender
     ORDER BY count DESC
     LIMIT ${limit}
  `;
}

export async function getOverallStats(): Promise<{
  total_messages: number;
  unique_senders: number;
  unique_senders_30d: number;
  first_ts: string | null;
  last_ts: string | null;
  classified: number;
}> {
  const [row] = await sql()<{
    total_messages: string;
    unique_senders: string;
    unique_senders_30d: string;
    first_ts: string | null;
    last_ts: string | null;
    classified: string;
  }[]>`
    SELECT COUNT(*)::text                                                     AS total_messages,
           COUNT(DISTINCT sender)::text                                       AS unique_senders,
           COUNT(DISTINCT sender) FILTER (
             WHERE ts > now() - interval '30 days'
           )::text                                                            AS unique_senders_30d,
           MIN(ts)                                                            AS first_ts,
           MAX(ts)                                                            AS last_ts,
           COUNT(*) FILTER (WHERE classified_at IS NOT NULL)::text            AS classified
      FROM odion.insights_messages
  `;
  return {
    total_messages: Number(row.total_messages),
    unique_senders: Number(row.unique_senders),
    unique_senders_30d: Number(row.unique_senders_30d),
    first_ts: row.first_ts,
    last_ts: row.last_ts,
    classified: Number(row.classified),
  };
}
