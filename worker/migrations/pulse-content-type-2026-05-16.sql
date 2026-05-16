-- Classify pulse activities by content type: video / short / live / live_upcoming / live_past / instagram_post / reel
-- Lets the /live page show "🔴 LIVE NOW" vs "🎞 SHORT" vs "🎬 VIDEO" categorically.
-- 2026-05-16

ALTER TABLE pulse_activities ADD COLUMN content_type TEXT DEFAULT 'video';
ALTER TABLE pulse_activities ADD COLUMN duration_sec INTEGER;
ALTER TABLE pulse_activities ADD COLUMN view_count INTEGER;
ALTER TABLE pulse_activities ADD COLUMN like_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_pulse_content_type ON pulse_activities(content_type);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.pulse_content_type',
  'info',
  '2026-05-16 added content_type/duration_sec/view_count/like_count to pulse_activities',
  '{"version":"2026-05-16"}'
);
