-- Recurring scheduled task: every 6h, enqueue ig_recent_posts_fetch for each
-- managed IG account of every active client. Surfaces IG posts on /live.
-- 2026-05-17

INSERT OR REPLACE INTO scheduled_tasks (
  id, name, description, cron, task_type, payload_json, enabled, created_by, created_at
)
VALUES (
  'st-ig-posts-sweep',
  'IG posts sweep',
  'Every 2h: fetch recent IG posts for every managed IG handle. Surfaces posts on the public /live feed alongside YT uploads.',
  '0 */2 * * *',
  'ig_posts_sweep',
  '{"prompt":"For every ACTIVE client where status=''active'', iterate every active row in instagram_accounts WHERE managed_by_us=1 and enqueue an ig_recent_posts_fetch task. Pass {handle, client_id} in the payload. Worker side-effects upsert the resulting posts into instagram_posts; they appear on /live within 60s of the laptop completing the task."}',
  1,
  'migration',
  CURRENT_TIMESTAMP
);

-- Kick off one immediate sweep so we don't wait 6 hours for first data.
INSERT OR IGNORE INTO laptop_tasks (id, type, client_id, payload_json, priority, max_attempts, created_by)
SELECT
  'igposts-' || ia.client_id || '-' || REPLACE(LOWER(ia.handle), '@', '') || '-' || strftime('%Y%m%d%H', 'now'),
  'ig_recent_posts_fetch',
  ia.client_id,
  '{"handle":"' || REPLACE(LOWER(ia.handle), '@', '') || '","source":"first_sweep"}',
  4,
  3,
  'migration_first_sweep'
FROM instagram_accounts ia
JOIN clients c ON ia.client_id = c.id
WHERE ia.active = 1
  AND COALESCE(ia.managed_by_us, 1) = 1
  AND COALESCE(c.status, 'active') = 'active';

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'ig_posts.cron_installed',
  'info',
  '2026-05-17 installed 6h IG-posts sweep cron + first-pass enqueue',
  '{"version":"2026-05-17"}'
);
