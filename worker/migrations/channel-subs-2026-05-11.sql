-- ============================================================================
-- channel-subs-2026-05-11.sql
-- ============================================================================
-- Add subscribers + last_synced_at to client_channels so multi-channel
-- clients (Kamz 3 YT, Anchit 2 YT, Kiaraa 2 YT, etc.) can show per-channel
-- counts in cockpit, not just the primary channel total.
-- ============================================================================

ALTER TABLE client_channels ADD COLUMN subscribers INTEGER DEFAULT 0;
ALTER TABLE client_channels ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE client_channels ADD COLUMN video_count INTEGER DEFAULT 0;
ALTER TABLE client_channels ADD COLUMN last_synced_at INTEGER;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.channel_subs',
  'info',
  '2026-05-11 added subscribers + view_count + video_count + last_synced_at to client_channels',
  '{"version":"2026-05-11"}'
);
