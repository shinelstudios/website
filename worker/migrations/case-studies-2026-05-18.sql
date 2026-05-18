-- case-studies-2026-05-18.sql
--
-- New `case_studies` table that powers the homepage FeaturedCaseStudies
-- section. Lets the founder add/edit case studies from the cockpit without
-- a code change to the React component.
--
-- Until 2026-05-18 the homepage's "See what landed" grid was a hardcoded
-- 3-item array inside FeaturedCaseStudies.jsx. This migration moves that
-- data into D1 and seeds the same 3 rows so the section keeps rendering
-- real content the moment the migration is applied.
--
-- Each case study supports up to 3 metric badges (label/value/icon name).
-- Icons are referenced by lucide-react name (e.g. "Eye", "Users", "Radio")
-- and the React component maps the string → component at render time.
-- 2026-05-18

CREATE TABLE IF NOT EXISTS case_studies (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  title TEXT NOT NULL,
  client_name TEXT,
  asset_type TEXT,  -- "stream" | "music_video" | "short" | "long_form"
  posted_at INTEGER,  -- unix seconds
  poster_url TEXT,
  video_url TEXT,
  metric_1_label TEXT, metric_1_value TEXT, metric_1_icon TEXT,
  metric_2_label TEXT, metric_2_value TEXT, metric_2_icon TEXT,
  metric_3_label TEXT, metric_3_value TEXT, metric_3_icon TEXT,
  sort_order INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  public_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_case_studies_featured
  ON case_studies(featured, sort_order, posted_at);

-- Seed: the 3 case studies that were previously hardcoded in
-- FeaturedCaseStudies.jsx. Posted-at timestamps are approximate (the
-- component originally rendered them as "8 days ago" / "30 days ago"
-- relative to 2026-05-18), but the table now stores absolute unix seconds
-- so the homepage can keep showing accurate relative labels going forward.
--   2026-05-10 ≈ 1778976000 (8 days before 2026-05-18)
--   2026-04-18 ≈ 1776988800 (30 days before 2026-05-18)
INSERT OR IGNORE INTO case_studies (
  id, title, client_name, asset_type, posted_at,
  metric_1_label, metric_1_value, metric_1_icon,
  metric_2_label, metric_2_value, metric_2_icon,
  metric_3_label, metric_3_value, metric_3_icon,
  sort_order, featured, public_enabled
) VALUES
  (
    'kiaraa-pharaoh',
    'BGMI 4.3 PHARAOH MODE LIVE',
    'Kiaraa Gaming',
    'stream',
    1778976000,
    'Views', '18K', 'Eye',
    'Peak',  '250', 'Users',
    'Type',  'Stream', 'Radio',
    10, 1, 1
  ),
  (
    'aish-1v1-subs',
    'ONLY HEADSHOTS!? — 1v1 vs Subs LIVE | BGMI Hindi',
    'Aish is Live',
    'stream',
    1778976000,
    'Views', '12K', 'Eye',
    'Peak',  '180', 'Users',
    'Type',  'Stream', 'Radio',
    20, 1, 1
  ),
  (
    'kamz-naina',
    'NAINA · Inkboy Musik',
    'Kamz Inkzone',
    'music_video',
    1776988800,
    'Views', '80K',   'Eye',
    'Likes', '8.5K',  'Heart',
    'Type',  'Music', 'Music2',
    30, 1, 1
  );

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'case_studies.table_created',
  'info',
  '2026-05-18 created case_studies table + seeded 3 rows from FeaturedCaseStudies.jsx hardcoded list',
  '{"version":"2026-05-18","seeded":3}'
);
