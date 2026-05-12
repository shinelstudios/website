-- Editor portfolio: editors upload their own thumbnails / videos / shorts
-- to show off their work. Mirrors the Shinel public showcase structure
-- but lighter — no live YT view counts fetched for editor uploads.
-- 2026-05-11

-- Extend the editors table with public-profile fields.
ALTER TABLE editors ADD COLUMN slug TEXT;
ALTER TABLE editors ADD COLUMN public_enabled INTEGER DEFAULT 0;
ALTER TABLE editors ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE editors ADD COLUMN avatar_url TEXT;
ALTER TABLE editors ADD COLUMN cover_url TEXT;
ALTER TABLE editors ADD COLUMN portfolio_color TEXT DEFAULT '#E85002';
ALTER TABLE editors ADD COLUMN socials_json TEXT DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_editors_slug ON editors(slug) WHERE slug IS NOT NULL;

-- Per-editor portfolio items.
CREATE TABLE IF NOT EXISTS editor_portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  editor_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,                     -- thumbnail | video | short | reel
  source TEXT NOT NULL DEFAULT 'personal',      -- shinel | personal
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  client_attribution TEXT,                      -- e.g. "Personal client - Channel X"
  thumbnail_url TEXT,                           -- preview image (R2 / external)
  video_url TEXT,                               -- YT / Instagram / R2 link if applicable
  embed_youtube_id TEXT,                        -- shortcut: just the YT video ID
  tags TEXT DEFAULT '',                         -- comma-separated
  sort_order INTEGER DEFAULT 0,                 -- manual ordering on the public page
  featured INTEGER DEFAULT 0,                   -- pinned at the top
  public_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(editor_id) REFERENCES editors(id)
);
CREATE INDEX IF NOT EXISTS idx_editor_portfolio_editor ON editor_portfolio_items(editor_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_editor_portfolio_source ON editor_portfolio_items(source);
