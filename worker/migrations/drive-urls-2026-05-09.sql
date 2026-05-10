-- ============================================================================
-- drive-urls-2026-05-09.sql — bulk-set Drive folder URLs per client
-- ============================================================================
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/drive-urls-2026-05-09.sql
-- ============================================================================

-- AiSH is Live
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0ABC2rp3FanXJUk9PVA',
    drive_folder_id = '0ABC2rp3FanXJUk9PVA'
WHERE id = 'c-1769802065138-4rnx69bni5s';

-- AP Sports Arena
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0AMgCZNviVsH8Uk9PVA',
    drive_folder_id = '0AMgCZNviVsH8Uk9PVA'
WHERE id = 'c-2026-05-09-ap-sports-arena';

-- Deadlox Gaming (tracked-only)
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0ABnvRwd9WwrOUk9PVA',
    drive_folder_id = '0ABnvRwd9WwrOUk9PVA'
WHERE id = 'c-1769802242225-twuncdd5xy';

-- Gamify With Anchit
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0AALDnk7iih1FUk9P',
    drive_folder_id = '0AALDnk7iih1FUk9P'
WHERE id = 'c-1769795052179-stnyxjmqbz9';

-- Kamz Inkzone
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0ALN8h69bBAy8Uk9PVA',
    drive_folder_id = '0ALN8h69bBAy8Uk9PVA'
WHERE id = 'c-1769783528025-accl7vadsl';

-- Kiaraa Gaming
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0ANn2Wv_yZnRmUk9PVA',
    drive_folder_id = '0ANn2Wv_yZnRmUk9PVA'
WHERE id = 'c-1769802499809-xwapop8353';

-- Kundan Parashar
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0ACwk4MdW1T9kUk9PVA',
    drive_folder_id = '0ACwk4MdW1T9kUk9PVA'
WHERE id = 'c-1769794849355-34851lo1g0p';

-- Vib n Ric (tracked-only)
UPDATE clients
SET drive_folder_url = 'https://drive.google.com/drive/u/5/folders/0AFlqVpYgBTA9Uk9PVA',
    drive_folder_id = '0AFlqVpYgBTA9Uk9PVA'
WHERE id = 'c-1769802184475-hrg24ctuorl';

-- (Shinel Studios — pending; you can set via cockpit + Drive button later)

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'drive_folder.bulk_set',
  'info',
  '2026-05-09 bulk-set Drive folder URLs for 8 active clients',
  '{"version":"2026-05-09","clients_updated":8,"missing":["Shinel Studios"]}'
);
