-- ============================================================================
-- trigger-ig-sweep-all-2026-05-11.sql
-- ============================================================================
-- Two changes:
-- 1. Update the recurring scheduled task's prompt so the laptop fetches
--    follower counts for EVERY active IG, not just managed_by_us=1 ones.
--    (Founder policy May 2026: track reach for all surfaces; managed flag
--    only governs whether WE do active management work.)
-- 2. Immediately enqueue an ig_followers_fetch for every currently
--    untracked IG so the first sweep happens within the next 20 min
--    instead of waiting for the next 8AM/8PM IST scheduled tick.
-- ============================================================================

-- 1. Update the scheduled task prompt (idempotent — UPDATEs whatever exists)
UPDATE scheduled_tasks
SET payload_json = '{"prompt":"For every ACTIVE client (regardless of managed_by_us flag), iterate every active row in instagram_accounts and enqueue an ig_followers_fetch task. Pass {handle, client_id} in the payload. Worker side-effects auto-update instagram_accounts.followers and (for the primary handle) clients.instagram_followers."}',
    description = 'Twice daily: fetch follower count for every ACTIVE IG handle across all clients (managed or tracked-only). Updates instagram_accounts.followers + the primary handle on clients.instagram_followers.'
WHERE id = 'st-ig-followers-sweep';

-- 2. Immediately enqueue for every IG not already in the queue today.
--    Includes accounts with managed_by_us=0 (the new behavior).
INSERT OR IGNORE INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
SELECT
  'igfetch-' || ia.client_id || '-' || REPLACE(LOWER(ia.handle), '@', '') || '-' || strftime('%Y%m%d%H', 'now'),
  'ig_followers_fetch',
  ia.client_id,
  '{"handle":"' || REPLACE(LOWER(ia.handle), '@', '') || '","source":"all_sweep_policy_change"}',
  3,
  3,
  'manual_ig_sweep_all'
FROM instagram_accounts ia
JOIN clients c ON ia.client_id = c.id
WHERE ia.active = 1
  AND (c.status = 'active' OR c.status IS NULL);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'ig_sweep.triggered',
  'info',
  'Policy change: enqueued ig_followers_fetch for every active IG (managed + tracked-only)',
  '{"version":"2026-05-11","scope":"all_active_accounts"}'
);
