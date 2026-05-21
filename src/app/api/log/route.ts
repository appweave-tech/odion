import { NextResponse, type NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// /api/log — append-only error sink. Reachable from client error reporters
// and server-side error boundaries. Returns 204 fast; payload is bounded
// and per-device rate-limited so a malicious flood can't fill the table.
//
// Body shape (all fields optional except `kind` + `message`):
// {
//   kind: 'window.error' | 'unhandledrejection' | 'rsc.boundary' | 'api',
//   message: string,
//   level?: 'error' | 'warning',
//   digest?: string,
//   stack?: string,
//   url?: string,
//   ctx?: Record<string, unknown>,
// }

export const runtime = 'nodejs';
// Don't waste static cache machinery on a POST sink.
export const dynamic = 'force-dynamic';

const KINDS = new Set(['window.error', 'unhandledrejection', 'rsc.boundary', 'api']);
const LEVELS = new Set(['error', 'warning']);
const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_URL = 500;
const MAX_DIGEST = 64;
// Per-device burst cap. Generous enough to capture a real outage on one
// device, tight enough that a script-kiddie can't fill the table.
const PER_DEVICE_BURST = 30;

function clamp(s: unknown, max: number): string | null {
  if (typeof s !== 'string') return null;
  if (s.length === 0) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const kind = String(body.kind ?? '');
  const message = clamp(body.message, MAX_MESSAGE);
  if (!KINDS.has(kind) || !message) {
    return new NextResponse(null, { status: 400 });
  }

  const level = LEVELS.has(String(body.level)) ? String(body.level) : 'error';
  const digest = clamp(body.digest, MAX_DIGEST);
  const stack = clamp(body.stack, MAX_STACK);
  const url = clamp(body.url, MAX_URL);
  const ctxRaw = body.ctx;
  const ctx = ctxRaw && typeof ctxRaw === 'object' ? ctxRaw : null;

  const deviceId = req.cookies.get('odion-device')?.value ?? null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || null;
  const ua = clamp(req.headers.get('user-agent'), MAX_STACK);

  // Per-device cap; protects against a single bad-actor device flooding.
  // Cheap index range scan against error_log_device_ts_idx.
  if (deviceId) {
    try {
      const [row] = await sql()<{ recent: string }[]>`
        SELECT COUNT(*)::text AS recent
        FROM odion.error_log
        WHERE device_id = ${deviceId}
          AND ts > now() - interval '60 seconds'
      `;
      if (Number(row.recent) >= PER_DEVICE_BURST) {
        return new NextResponse(null, { status: 429 });
      }
    } catch {
      // Counting failed — don't block the insert path.
    }
  }

  try {
    await sql()`
      INSERT INTO odion.error_log
        (level, kind, message, digest, stack, url, user_agent, device_id, ip, ctx)
      VALUES
        (${level}, ${kind}, ${message}, ${digest}, ${stack}, ${url}, ${ua}, ${deviceId}, ${ip}, ${ctx ? JSON.stringify(ctx) : null}::jsonb)
    `;
  } catch (e) {
    // Last thing we want is /api/log itself crashing the page that's already
    // having a bad day. Swallow and surface via the dev console.
    console.error('[odion:/api/log] insert failed', e);
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
