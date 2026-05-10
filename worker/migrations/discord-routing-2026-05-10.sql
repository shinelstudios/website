-- ============================================================================
-- discord-routing-2026-05-10.sql — per-client Discord webhook + editor Discord ID
-- ============================================================================
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/discord-routing-2026-05-10.sql
-- ============================================================================

-- Per-client Discord webhook — when set, status-change pings + upload feed
-- ALSO fire to this URL (in addition to the global ops/finance/uploads channels).
-- Lets you have a per-client channel that gets pinged for that client only.
ALTER TABLE clients ADD COLUMN discord_webhook_url TEXT;

-- Optional: editor's Discord user ID, so weekly summaries can @-mention them.
-- Get from Discord: enable Developer Mode → right-click member → Copy User ID.
ALTER TABLE editors ADD COLUMN discord_user_id TEXT;

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.discord_routing',
  'info',
  '2026-05-10 added clients.discord_webhook_url + editors.discord_user_id',
  '{"version":"2026-05-10"}'
);
