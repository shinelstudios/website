-- ============================================================================
-- backfill-youtube-ids-2026-05-10.sql
-- ============================================================================
-- The pulse sync reads clients.youtube_id (legacy single-channel field).
-- Multi-channel clients have their channels in client_channels but their
-- primary clients.youtube_id may be NULL — that's why most clients show
-- 0 subs in the cockpit even though channels exist.
--
-- This migration backfills clients.youtube_id from client_channels (picks
-- the row with role='main' first, falls back to any active row).
--
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/backfill-youtube-ids-2026-05-10.sql
-- ============================================================================

-- Backfill: pick the main channel first
UPDATE clients
SET youtube_id = (
  SELECT channel_id FROM client_channels
  WHERE client_id = clients.id AND active = 1 AND role = 'main'
  ORDER BY channel_id LIMIT 1
)
WHERE (youtube_id IS NULL OR youtube_id = '')
  AND EXISTS (
    SELECT 1 FROM client_channels
    WHERE client_id = clients.id AND active = 1 AND role = 'main'
  );

-- Fallback: if no 'main' role, take any active channel
UPDATE clients
SET youtube_id = (
  SELECT channel_id FROM client_channels
  WHERE client_id = clients.id AND active = 1
  ORDER BY channel_id LIMIT 1
)
WHERE (youtube_id IS NULL OR youtube_id = '')
  AND EXISTS (
    SELECT 1 FROM client_channels
    WHERE client_id = clients.id AND active = 1
  );

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.youtube_id_backfill',
  'info',
  'Backfilled clients.youtube_id from client_channels for multi-channel clients',
  '{"version":"2026-05-10"}'
);
