-- ============================================================================
-- scheduled-tasks-2026-05-11.sql
-- ============================================================================
-- One source of truth for all scheduled work. The worker cron (30-min tick)
-- checks this table for due tasks and enqueues them into laptop_tasks.
-- The always-on laptop polls laptop_tasks and executes.
--
-- Cron expressions are evaluated in IST (Asia/Kolkata).
--
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/scheduled-tasks-2026-05-11.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,           -- "Daily research per client"
  description     TEXT,                    -- shown in cockpit
  cron            TEXT NOT NULL,           -- "0 3 * * *" = 3am daily (IST)
  task_type       TEXT NOT NULL DEFAULT 'custom_prompt',  -- what the laptop runs
  payload_json    TEXT,                    -- prompt + any args
  client_id       TEXT,                    -- optional scope
  enabled         INTEGER NOT NULL DEFAULT 1,
  last_run_ts     INTEGER,                 -- unix sec
  last_run_status TEXT,                    -- 'done' | 'failed' | 'skipped'
  last_run_task_id TEXT,                   -- id of the laptop_task it spawned
  next_run_ts     INTEGER,                 -- unix sec; computed from cron
  run_count       INTEGER NOT NULL DEFAULT 0,
  fail_count      INTEGER NOT NULL DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
  ON scheduled_tasks(enabled, next_run_ts);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_client
  ON scheduled_tasks(client_id);

-- Seed with the migration of existing Cowork tasks. These are STUBS — the
-- cockpit Schedule panel lets you edit cron + prompt as you settle in.
-- All times are IST evaluated.
INSERT OR IGNORE INTO scheduled_tasks (id, name, description, cron, task_type, payload_json, enabled, created_by) VALUES
  ('st-daily-research',         'Daily research per client', 'Run the per-client research workflow that builds today''s health card, content menu, and SEO ideas. Replaces the old Cowork ''Shinel daily research'' job.', '0 3 * * *',  'daily_research_run',
   '{"prompt":"Run today''s research pass for every active managed client. Update D1 daily_research table. Post a summary line to Discord #ops-pipeline."}', 1, 'migration'),

  ('st-news-spike-scan',         'News spike scanner',       'Check niche-relevant news (BGMI patches, VCT events, festivals, devotional dates) every 4 hours. Insert spikes into news_spikes when score > threshold.',                                  '0 */4 * * *', 'news_spike_scan',
   '{"prompt":"Scan news sources for niche-relevant spikes across all managed clients'' niche_tags. Update news_spikes table. Discord-ping #alerts if spike_score > 7."}', 1, 'migration'),

  ('st-content-pipeline-review', 'Content pipeline review',   'Daily 9am review: planned/started projects, blockers, overdue items. Posts summary to #ops-pipeline.',                                                                                  '0 9 * * *',   'content_pipeline_review',
   '{"prompt":"Pull projects in planned/started/in-progress status. Identify overdue (past due_date) and stale (no update in 5 days). Post a brief to #ops-pipeline with action items per editor."}', 1, 'migration'),

  ('st-weekly-client-report',    'Weekly client report',      'Sunday 10am: generate per-client performance recap (subs growth, posts shipped, top performer). Saves to Drive + Discord-pings the team.',                                              '0 10 * * 0',  'weekly_client_report',
   '{"prompt":"For each managed client, compile last-7-day stats from D1 + last-week vs week-before-last delta. Save report as markdown to client Drive folder. Post highlights to Discord #salaried-only."}', 1, 'migration'),

  ('st-ig-followers-sweep',      'IG followers sweep',        'Twice daily: fetch follower count for every managed client''s primary IG handle. Updates clients.instagram_followers.',                                                                  '0 8,20 * * *', 'ig_followers_sweep',
   '{"prompt":"For every managed client with an instagram_handle, enqueue an ig_followers_fetch task. Worker side-effects auto-update clients.instagram_followers."}', 1, 'migration'),

  ('st-milestone-check',         'Milestone check',           'Every 3 hours: scan all managed clients for any approaching round subscriber milestone (10K, 50K, 100K, 250K, 500K, 1M). Auto-spawns story tasks for candidates.',                       '0 */3 * * *', 'milestone_check',
   '{}', 1, 'migration');

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.scheduled_tasks',
  'info',
  '2026-05-11 added scheduled_tasks table + 6 default jobs (replaces Cowork-side schedules)',
  '{"version":"2026-05-11","seeded":6}'
);
