-- Founder policy May 2026: /live page shows EVERY active client's socials,
-- regardless of managed_by_us. Update the scheduled task prompts so the
-- laptop fetches posts from every IG of every active client — not just
-- the ones we actively manage.
-- 2026-05-17

UPDATE scheduled_tasks
SET payload_json = '{"prompt":"For every ACTIVE client where status=''active'', iterate every active row in instagram_accounts (ALL active IG handles regardless of managed_by_us) and enqueue an ig_recent_posts_fetch task. Pass {handle, client_id} in the payload. Worker side-effects upsert the resulting posts into instagram_posts; they appear on /live within 60s of the laptop completing the task."}',
    description = 'Every 2h: fetch recent IG posts for every IG handle of every active client. Surfaces posts on /live.'
WHERE id = 'st-ig-posts-sweep';

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'pulse.all_socials_policy',
  'info',
  '2026-05-17 pulse fans out to all socials of active clients (managed_by_us no longer gates /live)',
  '{"version":"2026-05-17"}'
);
