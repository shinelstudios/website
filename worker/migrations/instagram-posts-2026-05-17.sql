-- Instagram post cache for the Pulse feed.
--
-- The pulse_activities table is YT-only (constraint youtube_video_id UNIQUE).
-- Instagram posts live in a separate table with the same shape so the Pulse
-- query can UNION them at read time without bending the YT schema.
--
-- POPULATED BY: laptop SKILL `ig_recent_posts_fetch` running every ~hour
-- for each managed IG account of every active client. Worker just stores
-- what the laptop sends — no scraping in the worker (Meta blocks the IPs).
-- 2026-05-17

CREATE TABLE IF NOT EXISTS instagram_posts (
  id              TEXT PRIMARY KEY,         -- "ig-<shortcode>"
  shortcode       TEXT NOT NULL UNIQUE,     -- IG post permalink last segment
  client_id       TEXT NOT NULL,
  ig_handle       TEXT NOT NULL,
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  caption         TEXT,                     -- first 500 chars
  post_type       TEXT DEFAULT 'post',      -- post | reel | carousel | story
  like_count      INTEGER,
  comment_count   INTEGER,
  posted_at       INTEGER NOT NULL,         -- unix sec
  fetched_at      INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_ig_posts_client_time
  ON instagram_posts(client_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ig_posts_recent
  ON instagram_posts(posted_at DESC);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.instagram_posts',
  'info',
  '2026-05-17 created instagram_posts table for Pulse feed',
  '{"version":"2026-05-17"}'
);
