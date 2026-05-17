-- Per-channel managed_by_us flag on client_channels.
--
-- WHY: Today a client either is or isn't managed at the client level. But
-- in practice we often manage SOME of a client's channels and not others
-- (e.g. we run their main YT, they post Shorts themselves on a secondary
-- channel). Same logic exists for instagram_accounts.managed_by_us — this
-- mirrors it onto YT.
--
-- DEFAULT: 1 (assume managed) so existing rows keep behaving as before.
-- The Pulse cron will filter on this flag to avoid wasting YouTube API
-- quota on channels we don't actually own.
-- 2026-05-17

ALTER TABLE client_channels ADD COLUMN managed_by_us INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_client_channels_managed
  ON client_channels(client_id, managed_by_us, active);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.channel_managed_flag',
  'info',
  '2026-05-17 added managed_by_us to client_channels (default 1)',
  '{"version":"2026-05-17"}'
);
