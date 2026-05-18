-- Race fix: prevent two concurrent markSkip calls from producing duplicate "current" rows
-- for the same (villa_id, skip_date). The partial unique index matches the criterion used by
-- garbage_skip_events_current view: a row is "current" if void=false AND not superseded.
--
-- Step 1: collapse any pre-existing duplicate "current" rows by chaining them — the older
-- ones become superseded by the newer ones, preserving the full audit chain.

WITH ranked AS (
  SELECT
    id,
    villa_id,
    skip_date,
    created_at,
    LEAD(id) OVER (PARTITION BY villa_id, skip_date ORDER BY created_at) AS next_id
  FROM odion.garbage_skip_events
  WHERE void = false AND supersedes_event_id IS NULL
)
UPDATE odion.garbage_skip_events e
SET supersedes_event_id = r.id
FROM ranked r
WHERE e.id = r.next_id;

-- Step 2: enforce uniqueness going forward. Rows that ARE superseded
-- (supersedes_event_id IS NOT NULL) or are void markers are excluded from this index,
-- so the audit chain still works — only one "live" mark per (villa, date).

CREATE UNIQUE INDEX IF NOT EXISTS gse_active_uniq
  ON odion.garbage_skip_events (villa_id, skip_date)
  WHERE void = false AND supersedes_event_id IS NULL;
