-- ============================================================================
-- editor-discord-2026-05-10.sql — adds editors.discord_user_id only.
-- (clients.discord_webhook_url was already in schema.sql line 200; the
-- earlier discord-routing-2026-05-10.sql aborted on duplicate-column.)
-- ============================================================================
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/editor-discord-2026-05-10.sql
-- ============================================================================

ALTER TABLE editors ADD COLUMN discord_user_id TEXT;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.editor_discord_id',
  'info',
  '2026-05-10 added editors.discord_user_id (column for @-mentions in weekly editor summary)',
  '{"version":"2026-05-10"}'
);
