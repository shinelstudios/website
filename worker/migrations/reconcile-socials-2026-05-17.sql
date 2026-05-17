-- Reconcile clients.youtube_id + clients.instagram_handle with the
-- canonical multi-row tables (client_channels + instagram_accounts).
--
-- Policy (May 2026): canonical source of truth for socials is the
-- multi-row tables. The single-value columns on `clients` are kept only
-- as a fast lookup for legacy SELECTs and the pulse cron's secondary-channel
-- fan-out. This migration makes sure they're never out of date.
--
-- Rules:
--   - clients.youtube_id      ← client_channels.channel_id WHERE role='main' AND active=1
--                                 (if no main, picks the highest-sub channel)
--   - clients.instagram_handle ← instagram_accounts.handle WHERE role='main' AND active=1
--                                 (if no main, picks the highest-follower handle)
--   - If no rows exist in the multi-row table, the legacy column is preserved
--     (we never blank out a working value during reconciliation).
-- 2026-05-17

-- 1. Backfill clients.youtube_id from the canonical main channel
UPDATE clients
SET youtube_id = (
  SELECT cc.channel_id FROM client_channels cc
  WHERE cc.client_id = clients.id AND cc.active = 1
  ORDER BY (cc.role = 'main') DESC, COALESCE(cc.subscribers, 0) DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM client_channels cc
  WHERE cc.client_id = clients.id AND cc.active = 1
);

-- 2. Backfill clients.instagram_handle from the canonical main IG
UPDATE clients
SET instagram_handle = (
  SELECT ia.handle FROM instagram_accounts ia
  WHERE ia.client_id = clients.id AND ia.active = 1
  ORDER BY (ia.role = 'main') DESC, COALESCE(ia.followers, 0) DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM instagram_accounts ia
  WHERE ia.client_id = clients.id AND ia.active = 1
);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'socials.reconciled',
  'info',
  '2026-05-17 reconciled clients.youtube_id + clients.instagram_handle with multi-row tables',
  '{"version":"2026-05-17"}'
);
