-- Capture IP + user-agent on every skip event, claim, and admin action.
-- Enables forensic audit when a resident reports tampering ("someone marked my villa skipped").

ALTER TABLE odion.garbage_skip_events
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE odion.garbage_admin_actions
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE odion.devices
  ADD COLUMN IF NOT EXISTS last_ip text;

-- Speeds up "show me all events from this IP in the last 24h" forensic queries.
CREATE INDEX IF NOT EXISTS gse_ip_created_idx
  ON odion.garbage_skip_events (ip_address, created_at DESC);
