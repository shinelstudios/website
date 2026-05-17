-- Some instagram_accounts.handle rows were stored as full URLs
-- ("https://www.instagram.com/vibric") instead of clean handles ("vibric").
-- This breaks IG follower scraping, marquee display, and laptop task IDs.
-- 2026-05-17

-- Strip the URL prefix when it's there
UPDATE instagram_accounts
SET handle = REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(handle, 'https://www.instagram.com/', ''),
                  'http://www.instagram.com/', ''),
                'https://instagram.com/', ''),
              'http://instagram.com/', '')
WHERE handle LIKE '%instagram.com/%';

-- Trim any trailing slashes or query strings
UPDATE instagram_accounts
SET handle = SUBSTR(handle, 1, INSTR(handle || '/', '/') - 1)
WHERE handle LIKE '%/%';

UPDATE instagram_accounts
SET handle = SUBSTR(handle, 1, INSTR(handle || '?', '?') - 1)
WHERE handle LIKE '%?%';

-- Strip leading '@' if anyone stored it that way
UPDATE instagram_accounts
SET handle = SUBSTR(handle, 2)
WHERE handle LIKE '@%';

-- Same cleanup for client_channels.handle just in case
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

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'data.sanitize_handles',
  'info',
  '2026-05-17 stripped URL prefixes from instagram_accounts.handle + client_channels.handle',
  '{"version":"2026-05-17"}'
);
