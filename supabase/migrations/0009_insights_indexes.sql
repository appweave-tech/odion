-- Index for the unclassified-batch cursor used by classifyPendingMessagesTx.
-- Without this, reclassifyAll at scale (1M+ rows) does a sequential scan per batch.

CREATE INDEX IF NOT EXISTS insights_messages_unclassified_idx
  ON odion.insights_messages (id)
  WHERE classified_at IS NULL;
