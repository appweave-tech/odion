-- Soft delete for villas: preserves the row + the skip-event audit chain.
-- All reads now filter `WHERE deleted_at IS NULL`. adminRestoreVilla clears the flag.

ALTER TABLE odion.villas
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS villas_active_idx
  ON odion.villas (phase, number)
  WHERE deleted_at IS NULL;
