-- ============================================================================
-- schema-integrations.sql — Google Drive + Sheets integration fields
-- 2026-05-09
-- ============================================================================

-- Per-client Drive folder URL (where their assets live)
ALTER TABLE clients ADD COLUMN drive_folder_url TEXT;
ALTER TABLE clients ADD COLUMN drive_folder_id TEXT;     -- extracted from URL for API later

-- Optional per-client Notion-like custom links (we already use shinelstudios.in clientportal)
ALTER TABLE clients ADD COLUMN external_links_json TEXT; -- arbitrary [{label, url}] array

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.integrations',
  'info',
  '2026-05-09 added drive_folder_url, drive_folder_id, external_links_json to clients',
  '{"version":"2026-05-09"}'
);
