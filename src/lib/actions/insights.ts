'use server';

import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/actions/admin';
import { parseWhatsAppChat, type ParsedMessage } from '@/lib/parse/whatsapp';
import { classify } from '@/lib/classify/insights';
import type {
  CategoryStat,
  InsightsIngest,
  LiveIssue,
  TrendBucket,
} from '@/lib/types';
import { revalidatePath } from 'next/cache';
import JSZip from 'jszip';

async function extractChatText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const isZip = file.name.toLowerCase().endsWith('.zip') || buf.slice(0, 2).toString() === 'PK';
  if (!isZip) return buf.toString('utf8');
  const zip = await JSZip.loadAsync(buf);
  const entry =
    zip.file(/_chat\.txt$/i)[0] ??
    zip.file(/chat\.txt$/i)[0] ??
    zip.file(/\.txt$/i)[0];
  if (!entry) throw new Error('No _chat.txt found in zip');
  return entry.async('string');
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

  const [ingest] = await sql()<{ id: string }[]>`
    INSERT INTO odion.insights_ingests
      (filename, raw_size_bytes, parsed_count, chat_first_ts, chat_last_ts, status)
    VALUES (${file.name}, ${file.size}, ${messages.length}, ${first}, ${last}, 'parsed')
    RETURNING id
  `;

  const inserted = await insertMessages(messages, ingest.id);
  const classified = await classifyPendingMessages();

  await sql()`
    UPDATE odion.insights_ingests
       SET inserted_count = ${inserted},
           classified_count = ${classified},
           status = 'classified'
     WHERE id = ${ingest.id}
  `;

  revalidatePath('/insights');
  revalidatePath('/insights/admin');

  return { ingest_id: ingest.id, parsed: messages.length, inserted, classified };
}

async function insertMessages(messages: ParsedMessage[], ingestId: string): Promise<number> {
  if (messages.length === 0) return 0;

  // Batched insert with ON CONFLICT DO NOTHING (content_hash unique).
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
    const result = await sql()`
      INSERT INTO odion.insights_messages
        ${sql()(rows, 'ts', 'sender', 'body', 'content_hash', 'ingest_id')}
      ON CONFLICT (content_hash) DO NOTHING
      RETURNING id
    `;
    inserted += result.length;
  }
  return inserted;
}

async function classifyPendingMessages(): Promise<number> {
  // Classify ALL unclassified messages (cheap, deterministic). Includes any from
  // older ingests that for some reason never got a category.
  const rows = await sql()<{ id: string; body: string }[]>`
    SELECT id, body FROM odion.insights_messages WHERE classified_at IS NULL
  `;
  if (rows.length === 0) return 0;

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const ids: string[] = [];
    const cats: string[] = [];
    const intents: string[] = [];
    const phases: (string | null)[] = [];
    for (const r of slice) {
      const c = classify(r.body);
      ids.push(r.id);
      cats.push(c.category);
      intents.push(c.intent);
      phases.push(c.phase);
    }
    await sql()`
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
  }
  return rows.length;
}

export async function reclassifyAll(): Promise<number> {
  await requireAdmin();
  await sql()`UPDATE odion.insights_messages SET classified_at = NULL`;
  return classifyPendingMessages();
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

export async function getLiveIssues(): Promise<LiveIssue[]> {
  return sql()<LiveIssue[]>`
    SELECT c.key       AS category,
           c.label     AS label,
           c.emoji     AS emoji,
           c.color     AS color,
           agg.recent_count::int   AS recent_count,
           agg.unique_senders::int AS unique_senders,
           agg.last_ts             AS last_ts,
           agg.sample_bodies       AS sample_bodies
      FROM (
        SELECT category,
               COUNT(*)                                  AS recent_count,
               COUNT(DISTINCT sender)                    AS unique_senders,
               MAX(ts)                                   AS last_ts,
               (ARRAY_AGG(LEFT(body, 240) ORDER BY ts DESC))[1:3] AS sample_bodies
          FROM odion.insights_messages
         WHERE ts > now() - interval '7 days'
           AND category IS NOT NULL
           AND category <> 'community'
           AND intent IN ('complaint', 'question')
         GROUP BY category
        HAVING COUNT(DISTINCT sender) >= 2
      ) agg
      JOIN odion.insights_categories c ON c.key = agg.category
     ORDER BY agg.recent_count DESC, c.display_order
  `;
}

export async function getWeeklyTrend(weeks = 12): Promise<TrendBucket[]> {
  return sql()<TrendBucket[]>`
    SELECT date_trunc('week', ts)::date AS week_start,
           category,
           COUNT(*)::int AS count
      FROM odion.insights_messages
     WHERE category IS NOT NULL
       AND ts > now() - (${weeks} || ' weeks')::interval
     GROUP BY 1, 2
     ORDER BY 1, 2
  `;
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
  first_ts: string | null;
  last_ts: string | null;
  classified: number;
}> {
  const [row] = await sql()<{
    total_messages: string;
    unique_senders: string;
    first_ts: string | null;
    last_ts: string | null;
    classified: string;
  }[]>`
    SELECT COUNT(*)::text                                                     AS total_messages,
           COUNT(DISTINCT sender)::text                                       AS unique_senders,
           MIN(ts)                                                            AS first_ts,
           MAX(ts)                                                            AS last_ts,
           COUNT(*) FILTER (WHERE classified_at IS NOT NULL)::text            AS classified
      FROM odion.insights_messages
  `;
  return {
    total_messages: Number(row.total_messages),
    unique_senders: Number(row.unique_senders),
    first_ts: row.first_ts,
    last_ts: row.last_ts,
    classified: Number(row.classified),
  };
}
