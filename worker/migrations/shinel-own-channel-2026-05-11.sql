-- ============================================================================
-- shinel-own-channel-2026-05-11.sql
-- ============================================================================
-- Make sure Shinel Studios' OWN YT channel is registered. The current row
-- shows IG-only because clients.youtube_id was never set + no client_channels
-- row exists for it.
--
-- Shinel's main YT channel handle is @shinelstudios. We register the channel_id
-- here as a placeholder ("@shinelstudios") — the sync engine will resolve the
-- handle to a UCxxx channel ID on the next pulse sync (it auto-canonicalizes).
--
-- If you have the actual UCxxx ID, paste it in below instead of '@shinelstudios'.
-- ============================================================================

-- Insert Shinel Studios YT channel row (if not already present)
INSERT OR IGNORE INTO client_channels (id, client_id, channel_id, handle, role, language, active, notes)
VALUES (
  'cc-shinel-main',
  'c-2026-05-09-shinel-studios',
  '@shinelstudios',                -- will be canonicalized to UCxxx on next sync
  'shinelstudios',
  'main',
  'english',
  1,
  'Shinel Studios own YT channel. Placeholder handle; pulse sync will canonicalize.'
);

-- Update clients.youtube_id so the pulse sync picks it up
UPDATE clients
SET youtube_id = '@shinelstudios'
WHERE id = 'c-2026-05-09-shinel-studios'
  AND (youtube_id IS NULL OR youtube_id = '');

-- Also ensure the "managed_by_us" flag is set (Shinel Studios is internally managed)
UPDATE clients
SET managed_by_us = 1
WHERE id = 'c-2026-05-09-shinel-studios'
  AND managed_by_us IS NULL;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.shinel_own_channel',
  'info',
  '2026-05-11 registered Shinel Studios own YT channel so pulse sync tracks it',
  '{"version":"2026-05-11"}'
);
