-- Track unlisted videos detected by the laptop's Studio audit pass.
-- Each row flows through states: detected → transcribed → seo_generated → applied
-- 2026-05-12

CREATE TABLE IF NOT EXISTS unlisted_uploads (
  video_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  client_id TEXT,
  title TEXT,
  detected_at TEXT DEFAULT (datetime('now')),
  privacy_status TEXT DEFAULT 'unlisted',
  scheduled_publish_at TEXT,                         -- if creator set a premiere/schedule
  transcript_status TEXT DEFAULT 'pending',          -- pending | done | failed | skipped
  transcript_text TEXT,
  transcript_fetched_at TEXT,
  transcript_source TEXT,                            -- youtubetotranscript | manual | etc
  seo_status TEXT DEFAULT 'pending',                 -- pending | generated | applied | dismissed
  seo_history_id INTEGER,                            -- link to the proposal we created
  seo_generated_at TEXT,
  seo_model TEXT,                                    -- which LLM generated it
  notes TEXT,
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(seo_history_id) REFERENCES seo_history(id)
);

CREATE INDEX IF NOT EXISTS idx_unlisted_channel ON unlisted_uploads(channel_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_unlisted_seo_status ON unlisted_uploads(seo_status);
CREATE INDEX IF NOT EXISTS idx_unlisted_transcript ON unlisted_uploads(transcript_status);
