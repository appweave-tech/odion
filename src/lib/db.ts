import 'server-only';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const schema = process.env.DB_SCHEMA ?? 'odion';

if (!url && process.env.NODE_ENV !== 'production') {
  console.warn('[db] DATABASE_URL not set — see ~/work/appweave/ops-suite/apps/portal/.env.local');
}

let _sql: ReturnType<typeof postgres> | null = null;

export function sql() {
  if (!url) throw new Error('DATABASE_URL not set');
  if (!_sql) {
    _sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      prepare: false,
      ssl: 'require',
      connection: { search_path: `${schema}, public` },
    });
  }
  return _sql;
}

export const SCHEMA = schema;
