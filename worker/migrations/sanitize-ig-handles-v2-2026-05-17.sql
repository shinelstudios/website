-- Round 2 of IG handle sanitize. Simpler strategy: just soft-deactivate
-- every URL-form row. The clean rows already exist for most clients
-- (per the earlier audit). For any client where only the URL-form row
-- existed, the founder can re-add the clean handle from the cockpit's
-- Socials Manager → Edit modal (re-add upserts back to active).
-- 2026-05-17

-- Soft-deactivate every IG row whose handle contains "instagram.com/"
UPDATE instagram_accounts
SET active = 0
WHERE handle LIKE '%instagram.com/%';

-- Same for client_channels — but client_channels.handle has no UNIQUE so
-- we can safely UPDATE in place.
UPDATE client_channels
SET handle = REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(handle, 'https://www.youtube.com/', ''),
                  'http://www.youtube.com/', ''),
                'https://youtube.com/', ''),
              'http://youtube.com/', '')
WHERE handle LIKE '%youtube.com/%';

UPDATE client_channels
SET handle = SUBSTR(handle, 1, INSTR(handle || '/', '/') - 1)
WHERE handle LIKE '%/%';

UPDATE client_channels
SET handle = SUBSTR(handle, 2)
WHERE handle LIKE '@%';

-- Cleanup leading @ on any remaining instagram_accounts (the active clean ones)
UPDATE instagram_accounts
SET handle = SUBSTR(handle, 2)
WHERE handle LIKE '@%' AND active = 1;

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'data.sanitize_handles_v2',
  'info',
  '2026-05-17 deactivated URL-form IG rows + sanitized YT channel handles',
  '{"version":"2026-05-17-v2"}'
);
