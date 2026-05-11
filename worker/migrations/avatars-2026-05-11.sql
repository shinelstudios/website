-- ============================================================================
-- avatars-2026-05-11.sql
-- ============================================================================
-- Per-channel and per-IG avatar URLs so the public marquee can render real
-- profile pictures instead of letter-in-circle fallbacks.
--   client_channels.avatar_url  — YT channel logo (synced from YT API)
--   instagram_accounts.avatar_url — IG profile pic (populated by laptop task)
-- ============================================================================

ALTER TABLE client_channels      ADD COLUMN avatar_url TEXT;
ALTER TABLE instagram_accounts   ADD COLUMN avatar_url TEXT;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.avatars',
  'info',
  '2026-05-11 added avatar_url to client_channels + instagram_accounts',
  '{"version":"2026-05-11"}'
);
