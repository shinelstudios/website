-- ============================================================================
-- ig-bulk-2026-05-09.sql — bulk-populate instagram_accounts from user's list
-- ============================================================================
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/ig-bulk-2026-05-09.sql
-- ============================================================================

-- 1. Clean up auto-seeded rows whose handles don't match the user's actuals
--    (auto-seed used clients.instagram_handle which had placeholders)
DELETE FROM instagram_accounts WHERE handle = '@apsportsarena';
DELETE FROM instagram_accounts WHERE handle = '@shinelstudios';

-- 2. Bulk INSERT user's 18 actual handles, mapped to prod client_ids.
--    OR IGNORE protects against the maggielivereal seed which already matches.

-- ---- Kiaraa Gaming (2 IGs · 1 managed)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802499809-xwapop8353', 'kiaraa_gaming_',     'https://instagram.com/kiaraa_gaming_',     'main',      1, '2026-05-09 main BGMI gaming'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802499809-xwapop8353', 'kiaraabeyondlimits', 'https://instagram.com/kiaraabeyondlimits', 'secondary', 0, '2026-05-09 secondary tracked');

-- ---- Kamz Inkzone (6 IGs · 0 managed — Kamz IGs not managed by us)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'kamzinkzone',         'https://instagram.com/kamzinkzone',         'main',      0, '2026-05-09 main personal'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'kamzinkzonetattoos',  'https://instagram.com/kamzinkzonetattoos',  'secondary', 0, '2026-05-09 tattoo studio'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'kamzinkzoneclothing', 'https://instagram.com/kamzinkzoneclothing', 'business',  0, '2026-05-09 clothing line'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'kamzinkzoneskins',    'https://instagram.com/kamzinkzoneskins',    'business',  0, '2026-05-09 skins/merch'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'browninksin',         'https://instagram.com/browninksin',         'secondary', 0, '2026-05-09 Brown Ink line'),
  ('ig-' || lower(hex(randomblob(8))), 'c-1769783528025-accl7vadsl', 'inkboymusik',         'https://instagram.com/inkboymusik',         'secondary', 0, '2026-05-09 Inkboy Musik label');

-- ---- Gamify With Anchit (1 IG · 0 managed)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769795052179-stnyxjmqbz9', 'ig_gamify', 'https://instagram.com/ig_gamify', 'main', 0, '2026-05-09 not managed by us');

-- ---- AiSH is Live (1 IG · 0 managed)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802065138-4rnx69bni5s', 'aishyt_', 'https://instagram.com/aishyt_', 'main', 0, '2026-05-09 not managed by us');

-- ---- AP Sports Arena (1 IG · MANAGED — IG-only client)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-2026-05-09-ap-sports-arena', 'ap_sports_arena', 'https://instagram.com/ap_sports_arena', 'main', 1, '2026-05-09 IG-only client; we manage');

-- ---- Shinel Studios (3 IGs · ALL MANAGED — internal brand)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-2026-05-09-shinel-studios', 'shinel.studios',     'https://instagram.com/shinel.studios',     'main',      1, '2026-05-09 main brand'),
  ('ig-' || lower(hex(randomblob(8))), 'c-2026-05-09-shinel-studios', 'shinel.creatorhelp', 'https://instagram.com/shinel.creatorhelp', 'secondary', 1, '2026-05-09 creator-help vertical'),
  ('ig-' || lower(hex(randomblob(8))), 'c-2026-05-09-shinel-studios', 'shinelstudios.ai',   'https://instagram.com/shinelstudios.ai',   'secondary', 1, '2026-05-09 AI side');

-- ---- Vib n Ric (1 IG · 0 managed — tracked-only)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802184475-hrg24ctuorl', 'ivibsss', 'https://instagram.com/ivibsss', 'main', 0, '2026-05-09 tracked-only');

-- ---- Deadlox Gaming (1 IG · 0 managed — tracked-only)
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802242225-twuncdd5xy', 'deadloxgaming89', 'https://instagram.com/deadloxgaming89', 'main', 0, '2026-05-09 tracked-only');

-- ---- Gamer Mummy — archived client, but you provided their IG so we capture it
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes) VALUES
  ('ig-' || lower(hex(randomblob(8))), 'c-1769802124242-8zbnlgsoel', 'officialgamermummy', 'https://instagram.com/officialgamermummy', 'main', 0, '2026-05-09 archived client');

-- (maggielivereal already seeded for Maggie Live; managed_by_us already 0 from earlier UPDATE)

-- 3. Audit log
INSERT INTO agent_log (action, level, message, payload_json) VALUES (
  'instagram.bulk_import',
  'info',
  '2026-05-09 bulk-imported 17 IG handles from user list (covering 9 clients)',
  '{"version":"2026-05-09","handles_added":17,"clients_covered":9}'
);
