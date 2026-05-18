#!/usr/bin/env tsx
// Seed odion.villas from scripts/villas_seed.csv.
// Idempotent — ON CONFLICT skips existing (block, number) rows.
// Usage: npm run seed
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { parse } from 'csv-parse/sync';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set.');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });

type Row = { phase: string; number: string; label: string; display_order: string };

async function main() {
  const csvPath = path.resolve(process.cwd(), 'scripts/villas_seed.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Row[];
  console.log(`Seeding ${rows.length} villas…`);

  let inserted = 0;
  let skipped = 0;
  for (const r of rows) {
    const phase = r.phase.trim().toUpperCase();
    const number = Number(r.number);
    const displayOrder = Number(r.display_order);
    const res = await sql<{ id: string }[]>`
      INSERT INTO odion.villas (phase, number, display_order, verified)
      VALUES (${phase}, ${number}, ${displayOrder}, true)
      ON CONFLICT (phase, number) DO NOTHING
      RETURNING id
    `;
    if (res.length > 0) inserted++;
    else skipped++;
  }
  console.log(`Inserted: ${inserted} · already present: ${skipped}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
