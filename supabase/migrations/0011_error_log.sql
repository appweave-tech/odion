-- Lightweight error visibility without an external service. Captures both
-- client-side throws (window.error, unhandledrejection) and server-side
-- errors surfaced via the App Router error boundaries. The /api/log route
-- inserts here; admins can query the table directly.
--
-- Append-only; no foreign keys (devices may be cleared); fields are
-- truncated server-side before insert so a malicious flood can't fill the
-- table.

CREATE TABLE IF NOT EXISTS odion.error_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ts              timestamptz NOT NULL DEFAULT now(),
    level           text NOT NULL DEFAULT 'error',  -- 'error' | 'warning'
    kind            text NOT NULL,                  -- 'window.error' | 'unhandledrejection' | 'rsc.boundary' | 'api'
    message         text NOT NULL,
    digest          text,                           -- Next.js error digest for correlation
    stack           text,
    url             text,                           -- where the error happened (client URL)
    user_agent      text,
    device_id       text,                           -- odion-device cookie value, may be null
    ip              text,
    ctx             jsonb
);

CREATE INDEX IF NOT EXISTS error_log_ts_idx ON odion.error_log (ts DESC);
CREATE INDEX IF NOT EXISTS error_log_device_ts_idx ON odion.error_log (device_id, ts DESC);
CREATE INDEX IF NOT EXISTS error_log_ip_ts_idx ON odion.error_log (ip, ts DESC);
