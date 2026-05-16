-- ============================================================================
-- drive-shinel-2026-05-09.sql — set Shinel Studios' own Drive folder URL
-- ============================================================================
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/drive-shinel-2026-05-09.sql
-- ============================================================================

UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0AAWRU37Zi0BEUk9PVA',
    drive_folder_id = '0AAWRU37Zi0BEUk9PVA'
WHERE id = 'c-2026-05-09-shinel-studios';

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'drive_folder.set',
  'info',
  '2026-05-09 Drive folder URL set for Shinel Studios',
  '{"client_id":"c-2026-05-09-shinel-studios"}'
);
