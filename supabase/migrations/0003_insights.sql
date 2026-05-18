-- Insights module — WhatsApp chat analytics for the RWA group.
-- One ingest = one zip / _chat.txt upload by admin. Messages dedup by content_hash
-- so re-uploading an overlapping export only adds the new tail.

CREATE TABLE IF NOT EXISTS odion.insights_ingests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename            text NOT NULL,
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  raw_size_bytes      int,
  parsed_count        int NOT NULL DEFAULT 0,
  inserted_count      int NOT NULL DEFAULT 0,
  classified_count    int NOT NULL DEFAULT 0,
  chat_first_ts       timestamptz,
  chat_last_ts        timestamptz,
  status              text NOT NULL DEFAULT 'pending',
  error               text
);

CREATE INDEX IF NOT EXISTS insights_ingests_uploaded_idx
  ON odion.insights_ingests (uploaded_at DESC);

CREATE TABLE IF NOT EXISTS odion.insights_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts              timestamptz NOT NULL,
  sender          text NOT NULL,
  body            text NOT NULL,
  content_hash    text NOT NULL UNIQUE,
  category        text,
  intent          text,
  phase           text,
  ingest_id       uuid REFERENCES odion.insights_ingests(id) ON DELETE SET NULL,
  classified_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insights_messages_ts_idx
  ON odion.insights_messages (ts DESC);
CREATE INDEX IF NOT EXISTS insights_messages_category_idx
  ON odion.insights_messages (category);
CREATE INDEX IF NOT EXISTS insights_messages_sender_idx
  ON odion.insights_messages (sender);

CREATE TABLE IF NOT EXISTS odion.insights_categories (
  key             text PRIMARY KEY,
  label           text NOT NULL,
  emoji           text,
  color           text,
  display_order   int NOT NULL DEFAULT 100
);

INSERT INTO odion.insights_categories (key, label, emoji, color, display_order) VALUES
  ('garbage',     'Garbage',          '🗑️',  '#ef4444', 10),
  ('water',       'Water',            '💧',  '#0ea5e9', 20),
  ('power',       'Power',            '⚡',  '#f59e0b', 30),
  ('security',    'Security',         '🛡️',  '#6366f1', 40),
  ('builder',     'Builder / Legal',  '⚖️',  '#8b5cf6', 50),
  ('strays',      'Stray Animals',    '🐕',  '#a16207', 60),
  ('gas',         'GAIL Gas Pipeline','🔥',  '#dc2626', 70),
  ('roads',       'Roads',            '🛣️',  '#64748b', 80),
  ('maintenance', 'Maintenance',      '🔧',  '#0d9488', 90),
  ('community',   'Community / Other','💬',  '#94a3b8', 100)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      emoji = EXCLUDED.emoji,
      color = EXCLUDED.color,
      display_order = EXCLUDED.display_order;
