#!/usr/bin/env tsx
// Apply schema migrations to the appweave-ops Supabase project under schema=odion.
// Tracks applied filenames in odion._migrations so re-runs are idempotent.
// Usage: npm run migrate
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Source from ~/work/appweave/ops-suite/apps/portal/.env.local');
  process.exit(1);
}

// Pull the host out of the DSN for the confirmation prompt — pretty common
// pgconnstring shapes: postgres://user:pass@host:port/db. Avoid leaking creds.
function extractHost(dsn: string): string {
  try {
    const u = new URL(dsn);
    return `${u.hostname}${u.port ? ':' + u.port : ''}/${u.pathname.replace(/^\//, '')}`;
  } catch {
    return '(unparseable DSN)';
  }
}

function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a); }));
}

async function confirmTarget() {
  const target = extractHost(url!);
  console.log(`\n  Migrate target: ${target}`);
  if (process.env.MIGRATE_CONFIRM === 'odion-prod') {
    console.log('  MIGRATE_CONFIRM=odion-prod set — proceeding without prompt.\n');
    return;
  }
  const ans = (await ask(`  Type "yes" to apply migrations against this host: `)).trim().toLowerCase();
  if (ans !== 'yes') {
    console.error('Aborted.');
    process.exit(1);
  }
  console.log();
}

// Warns if migration filenames aren't contiguously numbered. Catches the
// "I deleted 0004 mid-stream" trap before it bites in prod.
function warnOnSequenceGaps(files: string[]) {
  const nums = files
    .map((f) => Number(f.match(/^(\d+)_/)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
      console.warn(`  ⚠ migration sequence gap between ${nums[i - 1]} and ${nums[i]}`);
    }
  }
}

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });

async function main() {
  await confirmTarget();

  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS odion;
    CREATE TABLE IF NOT EXISTS odion._migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await sql<{ filename: string }[]>`SELECT filename FROM odion._migrations`).map(
      (r) => r.filename,
    ),
  );

  const dir = path.resolve(process.cwd(), 'supabase/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  warnOnSequenceGaps(files);

  let ran = 0;
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`  ↷ ${f} (already applied)`);
      continue;
    }
    const body = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`→ Applying ${f} …`);
    await sql.unsafe(body);
    await sql`INSERT INTO odion._migrations (filename) VALUES (${f})`;
    console.log(`  ✓ ${f}`);
    ran++;
  }

  await sql.end();
  console.log(`\nDone. ${ran} new migration${ran === 1 ? '' : 's'} applied.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
