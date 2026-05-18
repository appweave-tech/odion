-- Track who created each auto-created villa, so findOrCreateVilla can rate-limit per device
-- and the admin queue can show provenance ("villa P8-42 was added from IP X by device Y").

ALTER TABLE odion.villas
  ADD COLUMN IF NOT EXISTS created_by_ip text,
  ADD COLUMN IF NOT EXISTS created_by_device uuid;

CREATE INDEX IF NOT EXISTS villas_creator_recent_idx
  ON odion.villas (created_by_device, created_at DESC)
  WHERE auto_created = true;
