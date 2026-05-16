-- Add the missing last_synced_at column that I've been writing to in code
-- but never actually added to the schema. Crashed the IG Diagnostic modal.
-- 2026-05-12

ALTER TABLE instagram_accounts ADD COLUMN last_synced_at INTEGER;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.ig_last_synced',
  'info',
  '2026-05-12 added last_synced_at to instagram_accounts',
  '{"version":"2026-05-12"}'
);
