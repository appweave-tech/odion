#!/usr/bin/env tsx
// CLI ingest for the insights module. Mirrors `ingestChatExport` server action
// but skips admin auth — only run locally with DATABASE_URL set.
// Usage: tsx scripts/ingest-chat.ts <path-to-zip-or-_chat.txt>

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import JSZip from 'jszip';
import { parseWhatsAppChat } from '../src/lib/parse/whatsapp';
import { classify } from '../src/lib/classify/insights';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: tsx scripts/ingest-chat.ts <zip-or-txt>');
  process.exit(1);
}
const filename = path.basename(file);
const buf = fs.readFileSync(file);

async function readChatText(): Promise<string> {
  const isZip = file.toLowerCase().endsWith('.zip') || buf.slice(0, 2).toString() === 'PK';
  if (!isZip) return buf.toString('utf8');
  const zip = await JSZip.loadAsync(buf);
  const entry =
    zip.file(/_chat\.txt$/i)[0] ?? zip.file(/chat\.txt$/i)[0] ?? zip.file(/\.txt$/i)[0];
  if (!entry) throw new Error('No _chat.txt found in zip');
  return entry.async('string');
}

const sql = postgres(url, {
  ssl: 'require',
  prepare: false,
  max: 1,
  connection: { search_path: 'odion, public' },
});

async function main() {
  const text = await readChatText();
  const messages = parseWhatsAppChat(text);
  console.log(`Parsed ${messages.length} messages from ${filename}`);
  if (messages.length === 0) {
    process.exit(1);
  }

  const first = messages[0].ts;
  const last = messages[messages.length - 1].ts;

  const [ingest] = await sql<{ id: string }[]>`
    INSERT INTO odion.insights_ingests
      (filename, raw_size_bytes, parsed_count, chat_first_ts, chat_last_ts, status)
    VALUES (${filename}, ${buf.length}, ${messages.length}, ${first}, ${last}, 'parsed')
    RETURNING id
  `;
  console.log(`Ingest id: ${ingest.id}`);

  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < messages.length; i += BATCH) {
    const slice = messages.slice(i, i + BATCH);
    const rows = slice.map((m) => ({
      ts: m.ts,
      sender: m.sender,
      body: m.body,
      content_hash: m.content_hash,
      ingest_id: ingest.id,
    }));
    const res = await sql`
      INSERT INTO odion.insights_messages
        ${sql(rows, 'ts', 'sender', 'body', 'content_hash', 'ingest_id')}
      ON CONFLICT (content_hash) DO NOTHING
      RETURNING id
    `;
    inserted += res.length;
    process.stdout.write(`  inserted ${inserted}\r`);
  }
  console.log(`\nInserted ${inserted} new messages`);

  const pending = await sql<{ id: string; body: string }[]>`
    SELECT id, body FROM odion.insights_messages WHERE classified_at IS NULL
  `;
  console.log(`Classifying ${pending.length} messages…`);

  let classified = 0;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
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
    await sql`
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
    classified += slice.length;
    process.stdout.write(`  classified ${classified}\r`);
  }
  console.log(`\nClassified ${classified}`);

  await sql`
    UPDATE odion.insights_ingests
       SET inserted_count = ${inserted},
           classified_count = ${classified},
           status = 'classified'
     WHERE id = ${ingest.id}
  `;

  // Quick summary
  const summary = await sql<{ category: string; count: string }[]>`
    SELECT category, COUNT(*)::text AS count
      FROM odion.insights_messages
     GROUP BY category
     ORDER BY COUNT(*) DESC
  `;
  console.log('\nCategory totals:');
  for (const row of summary) {
    console.log(`  ${row.category?.padEnd(12)} ${row.count}`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
