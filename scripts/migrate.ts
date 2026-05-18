#!/usr/bin/env tsx
// Apply schema migrations to the appweave-ops Supabase project under schema=odion.
// Tracks applied filenames in odion._migrations so re-runs are idempotent.
// Usage: npm run migrate
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Source from ~/work/appweave/ops-suite/apps/portal/.env.local');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });

async function main() {
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
