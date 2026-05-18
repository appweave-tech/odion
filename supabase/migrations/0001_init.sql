-- Odion community ops — schema bootstrap
-- Runs against the appweave-ops Supabase project. Schema is isolated as `odion`.
-- Shared tables: villas, devices. Module-prefixed tables: garbage_*.
-- "Phase" = P1, P2, ..., NGC. Villas are identified as Phase + Number.
-- Future modules (maintenance, dues, events) add their own *_ prefixed tables.

CREATE SCHEMA IF NOT EXISTS odion;
SET search_path TO odion, public;

-- Shared: physical villa registry. Block + Number addressing (P1, P2, ..., NGC).
CREATE TABLE IF NOT EXISTS odion.villas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phase           text NOT NULL,
    number          int  NOT NULL,
    label           text GENERATED ALWAYS AS (phase || '-' || number) STORED,
    display_order   int,
    auto_created    boolean NOT NULL DEFAULT false,  -- true if added via UI fallback
    verified        boolean NOT NULL DEFAULT false,  -- admin confirmed
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT villas_phase_number_unique UNIQUE (phase, number)
);

CREATE INDEX IF NOT EXISTS villas_label_idx ON odion.villas (label);
CREATE INDEX IF NOT EXISTS villas_phase_idx ON odion.villas (phase);

-- Shared: device → villa identity (no auth). Reset by clearing localStorage.
CREATE TABLE IF NOT EXISTS odion.devices (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    villa_id        uuid REFERENCES odion.villas(id) ON DELETE SET NULL,
    name            text,                              -- optional, free text
    phone           text,                              -- optional, free text
    user_agent      text,
    first_seen      timestamptz NOT NULL DEFAULT now(),
    last_seen       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devices_villa_idx ON odion.devices (villa_id);

-- Garbage module: skip events (append-only audit log).
-- Edit = insert new row with supersedes_event_id pointing at the old.
-- Delete = insert new row with void=true and supersedes_event_id set.
-- "Current" rows = void=false AND id NOT IN (SELECT supersedes_event_id FROM ... WHERE supersedes_event_id IS NOT NULL).
CREATE TABLE IF NOT EXISTS odion.garbage_skip_events (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    villa_id                uuid NOT NULL REFERENCES odion.villas(id) ON DELETE CASCADE,
    skip_date               date NOT NULL,             -- date the skip happened (not when reported)
    reported_by_device      uuid REFERENCES odion.devices(id) ON DELETE SET NULL,
    note                    text,                      -- optional resident note
    supersedes_event_id     uuid REFERENCES odion.garbage_skip_events(id),
    void                    boolean NOT NULL DEFAULT false,
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gse_date_idx ON odion.garbage_skip_events (skip_date);
CREATE INDEX IF NOT EXISTS gse_villa_date_idx ON odion.garbage_skip_events (villa_id, skip_date);
CREATE INDEX IF NOT EXISTS gse_supersedes_idx ON odion.garbage_skip_events (supersedes_event_id);

-- View: current (non-superseded, non-void) skip events. Use this for reads.
CREATE OR REPLACE VIEW odion.garbage_skip_events_current AS
SELECT e.*
FROM odion.garbage_skip_events e
WHERE e.void = false
  AND NOT EXISTS (
      SELECT 1 FROM odion.garbage_skip_events s
      WHERE s.supersedes_event_id = e.id
  );

-- Garbage module: admin audit trail.
CREATE TABLE IF NOT EXISTS odion.garbage_admin_actions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action          text NOT NULL,         -- 'edit_event' | 'void_event' | 'verify_villa' | 'merge_villa' | 'rename_villa' | 'csv_import'
    target_id       uuid,
    target_kind     text,                  -- 'skip_event' | 'villa' | 'device' | 'batch'
    note            text,
    at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gaa_at_idx ON odion.garbage_admin_actions (at DESC);

-- Rate-limit hint: cap a single device to N skip submissions per 60s window
-- (enforced in app code; placeholder index for fast lookups).
CREATE INDEX IF NOT EXISTS gse_device_created_idx
    ON odion.garbage_skip_events (reported_by_device, created_at DESC);
