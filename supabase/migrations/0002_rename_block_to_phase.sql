-- Rename villas.block → villas.phase.
-- "Phase" is the canonical community term (Phase 1 = P1, NGC = Nirmitha cluster).
-- Generated column `label` depends on block, so drop+recreate it around the rename.
-- Idempotent: only runs when the old column still exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'odion' AND table_name = 'villas' AND column_name = 'block'
  ) THEN
    ALTER TABLE odion.villas DROP COLUMN IF EXISTS label;
    ALTER TABLE odion.villas RENAME COLUMN block TO phase;
    ALTER TABLE odion.villas
      ADD COLUMN label text GENERATED ALWAYS AS (phase || '-' || number) STORED;

    DROP INDEX IF EXISTS odion.villas_block_idx;
    CREATE INDEX IF NOT EXISTS villas_phase_idx ON odion.villas (phase);
    CREATE INDEX IF NOT EXISTS villas_label_idx ON odion.villas (label);

    -- constraint name retained from 0001 (Postgres tracks by column oid, not name).
    -- Optional cosmetic rename:
    ALTER TABLE odion.villas
      RENAME CONSTRAINT villas_block_number_unique TO villas_phase_number_unique;
  END IF;
END $$;
