-- ============================================================================
-- trigger-ig-sweep-2026-05-11.sql
-- ============================================================================
-- Enqueue one ig_followers_fetch task per IG account on every managed
-- client. The always-on laptop will pick these up at its next poll (5-20 min)
-- and scrape current follower counts + avatars from instagram.com.
--
-- Idempotent-ish: uses INSERT OR IGNORE on a deterministic id so re-running
-- this within the same hour doesn't double-queue. Old completed/failed tasks
-- of the same id are untouched.
-- ============================================================================

INSERT OR IGNORE INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
SELECT
  'igfetch-' || ia.client_id || '-' || REPLACE(LOWER(ia.handle), '@', '') || '-' || strftime('%Y%m%d%H', 'now'),
  'ig_followers_fetch',
  ia.client_id,
  '{"handle":"' || REPLACE(LOWER(ia.handle), '@', '') || '","source":"manual_sweep"}',
  3,
  3,
  'manual_ig_sweep'
FROM instagram_accounts ia
JOIN clients c ON ia.client_id = c.id
WHERE ia.active = 1
  AND (c.status = 'active' OR c.status IS NULL);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'ig_sweep.triggered',
  'info',
  'Manually enqueued ig_followers_fetch for every active IG account',
  '{"version":"2026-05-11"}'
);
