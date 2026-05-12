-- Per-video stats snapshots — feeds the underperformer detector that
-- auto-creates RESEO proposals for videos doing <30% of channel median.
-- 2026-05-11

CREATE TABLE IF NOT EXISTS video_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  client_id TEXT,
  title TEXT,
  published_at TEXT,
  captured_at TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  duration_sec INTEGER DEFAULT 0,
  is_short INTEGER DEFAULT 0,
  age_days INTEGER DEFAULT 0,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_video_stats_channel ON video_stats(channel_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_stats_video ON video_stats(video_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_stats_client ON video_stats(client_id, captured_at DESC);

-- Tracking: which videos have already been flagged as underperformers so
-- we don't create duplicate proposals on every detector pass.
CREATE TABLE IF NOT EXISTS underperformer_flags (
  video_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  client_id TEXT,
  flagged_at TEXT DEFAULT (datetime('now')),
  flagged_views INTEGER,
  channel_median INTEGER,
  ratio REAL,
  seo_history_id INTEGER,
  status TEXT DEFAULT 'flagged',
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(seo_history_id) REFERENCES seo_history(id)
);
CREATE INDEX IF NOT EXISTS idx_underperformer_status ON underperformer_flags(status, flagged_at DESC);
