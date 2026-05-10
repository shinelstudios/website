-- ============================================================================
-- kanban-statuses-2026-05-10.sql — switch project workflow to user's new model
-- ============================================================================
-- New ladder: planned -> started -> in-progress -> completed -> paid -> posted
--             -> added-to-website -> archive
--
-- Mapping from old statuses (loose):
--   idea, script           -> planned
--   shoot                  -> started
--   edit, thumbnail        -> in-progress
--   seo, schedule          -> completed
--   publish                -> posted
--   live                   -> added-to-website (only if it's been added; else stays posted)
--   archive                -> archive
--
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/kanban-statuses-2026-05-10.sql
-- ============================================================================

-- Add tracking columns we'll use later for finance + Discord alerts
ALTER TABLE projects ADD COLUMN paid_at INTEGER;             -- unix seconds when status moved to 'paid'
ALTER TABLE projects ADD COLUMN posted_at INTEGER;           -- unix seconds when published
ALTER TABLE projects ADD COLUMN added_to_website_at INTEGER; -- unix seconds when surfaced on shinelstudios.in
ALTER TABLE projects ADD COLUMN status_history_json TEXT;    -- JSON array of {status, ts, by}

UPDATE projects SET status = 'planned'           WHERE status IN ('idea', 'script');
UPDATE projects SET status = 'started'           WHERE status = 'shoot';
UPDATE projects SET status = 'in-progress'       WHERE status IN ('edit', 'thumbnail');
UPDATE projects SET status = 'completed'         WHERE status IN ('seo', 'schedule');
UPDATE projects SET status = 'posted'            WHERE status IN ('publish', 'live');
-- 'archive' stays 'archive'

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'kanban.statuses.upgrade',
  'info',
  '2026-05-10 migrated projects to new status ladder (planned/started/in-progress/completed/paid/posted/added-to-website/archive)',
  '{"version":"2026-05-10"}'
);
