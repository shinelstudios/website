-- Tighten the IG-posts sweep cadence from every 6h to every 2h so the
-- /live feed never lags behind the 48h rolling window. Also prune any
-- pulse_activities older than 48h to clean up the table — the read query
-- now filters on timestamp so old rows would be invisible anyway, but
-- removing them keeps row count tidy and saves D1 reads.
-- 2026-05-17

UPDATE scheduled_tasks
SET cron = '0 */2 * * *',
    description = 'Every 2h: fetch recent IG posts for every managed IG handle. Keeps /live feed inside the 48h window without lag.'
WHERE id = 'st-ig-posts-sweep';

-- Prune YT pulse rows older than 48 hours (timestamp is unix ms)
DELETE FROM pulse_activities
WHERE timestamp < (strftime('%s', 'now') - 48 * 3600) * 1000;

-- Prune IG posts older than 48 hours (posted_at is unix sec)
-- Keep them for analytics? No — instagram_posts is purely a feed cache.
-- If we want longer-term post analytics we'd build a separate table.
DELETE FROM instagram_posts
WHERE posted_at < strftime('%s', 'now') - 48 * 3600;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'pulse.window_48h',
  'info',
  '2026-05-17 narrowed pulse window 72h→48h, IG sweep 6h→2h, pruned stale rows',
  '{"version":"2026-05-17"}'
);
