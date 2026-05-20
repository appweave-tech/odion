import 'server-only';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
const schema = process.env.DB_SCHEMA ?? 'odion';

if (!url && process.env.NODE_ENV !== 'production') {
  console.warn('[db] DATABASE_URL not set — see ~/work/appweave/ops-suite/apps/portal/.env.local');
}

// Stash the pool on globalThis so Next dev HMR and warm serverless instances
// reuse it across module re-evals. Each serverless instance still gets its own
// pool — keep `max` small (Supabase pooler has a per-project connection cap).
type PgClient = ReturnType<typeof postgres>;
const globalForDb = globalThis as unknown as { _odionSql?: PgClient };

export function sql(): PgClient {
  if (!url) throw new Error('DATABASE_URL not set');
  if (!globalForDb._odionSql) {
    globalForDb._odionSql = postgres(url, {
      max: 2,
      idle_timeout: 20,
      prepare: false,
      ssl: 'require',
      connection: { search_path: `${schema}, public` },
    });
  }
  return globalForDb._odionSql;
}

export const SCHEMA = schema;
