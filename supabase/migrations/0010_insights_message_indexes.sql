-- Indexes for the hot /insights read queries.
--
-- getCategoryStats / getCategoryPulse / getOverallStats / getTopContributors
-- all filter on `ts > now() - interval 'N days'` and frequently scope to
-- `category IS NOT NULL` or `category = X`. The existing schema only had an
-- index on (id) WHERE classified_at IS NULL (used by the classifier cursor),
-- so every read scanned the whole table.
--
-- Two indexes:
--   1. (ts DESC) — speeds the bare time-range filters used by getOverallStats
--      and getTopContributors.
--   2. partial (category, ts DESC) WHERE category IS NOT NULL — covers the
--      per-category time-range aggregates in getCategoryStats and
--      getCategoryPulse. Partial keeps the index small (excludes unclassified rows).

CREATE INDEX IF NOT EXISTS insights_messages_ts_idx
  ON odion.insights_messages (ts DESC);

CREATE INDEX IF NOT EXISTS insights_messages_category_ts_idx
  ON odion.insights_messages (category, ts DESC)
  WHERE category IS NOT NULL;
