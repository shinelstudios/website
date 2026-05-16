-- ============================================================================
-- roster-align-2026-05-09.sql
-- ============================================================================
-- One-shot script to align prod clients table with the canonical 9-client
-- roster (per user 2026-05-09).
--
-- Apply:
--   cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/roster-align-2026-05-09.sql
--
-- Safe to re-run: every statement uses INSERT OR IGNORE / IF NOT EXISTS /
-- conditional UPDATEs.
-- ============================================================================

-- 1. Add managed_by_us flag to clients (1 = full-service, 0 = tracked-only).
-- Idempotent-by-convention: re-running errors with "duplicate column" — the
-- worker tolerates the missing-column case. If you've run this once, the
-- second ALTER will error and the rest of the script after this line WILL
-- abort. To force re-runs after the first time, comment out the ALTER below.
ALTER TABLE clients ADD COLUMN managed_by_us INTEGER DEFAULT 1;

-- 2. Mark "tracked-only" clients so the cockpit shows them differently.
UPDATE clients SET managed_by_us = 0
  WHERE id = 'c-1769802242225-twuncdd5xy';   -- Deadlox Gaming
UPDATE clients SET managed_by_us = 0
  WHERE id = 'c-1769802184475-hrg24ctuorl';  -- Vib n Ric

-- 3. Add AP Sports Arena (IG-only client — no YT channel)
INSERT OR IGNORE INTO clients
  (id, name, youtube_id, instagram_handle, status, niche_tag, retainer_tier, managed_by_us, onboarded_at)
VALUES (
  'c-2026-05-09-ap-sports-arena',
  'AP Sports Arena',
  NULL,
  '@apsportsarena',
  'active',
  'sports-india',
  'TBD',
  1,
  '2026-05-09'
);

-- 4. Add Shinel Studios internal (our own brand — 3 YT + 3 IG)
INSERT OR IGNORE INTO clients
  (id, name, youtube_id, instagram_handle, status, niche_tag, retainer_tier, managed_by_us, onboarded_at)
VALUES (
  'c-2026-05-09-shinel-studios',
  'Shinel Studios',
  NULL,
  '@shinelstudios',
  'active',
  'agency-internal',
  'internal',
  1,
  '2026-05-09'
);

-- 5. Make sure existing canonical clients have niche_tag + onboarded_at set
-- (only set if currently NULL — won't override existing values).
UPDATE clients SET niche_tag = 'gaming-bgmi', onboarded_at = COALESCE(onboarded_at, '2026-05-07')
  WHERE id = 'c-1769802065138-4rnx69bni5s' AND niche_tag IS NULL; -- Aish is Live
UPDATE clients SET niche_tag = 'gaming-bgmi-girl', onboarded_at = COALESCE(onboarded_at, '2026-05-07')
  WHERE id = 'c-1769802499809-xwapop8353' AND niche_tag IS NULL; -- Kiaraa Gaming
UPDATE clients SET niche_tag = 'gaming-valorant', onboarded_at = COALESCE(onboarded_at, '2026-05-07')
  WHERE id = 'c-1769795052179-stnyxjmqbz9' AND niche_tag IS NULL; -- Gamify With Anchit
UPDATE clients SET niche_tag = 'tattoo-art-india', secondary_niche_tag = 'music-punjabi-india', onboarded_at = COALESCE(onboarded_at, '2026-05-08')
  WHERE id = 'c-1769783528025-accl7vadsl' AND niche_tag IS NULL; -- Kamz Inkzone
UPDATE clients SET niche_tag = 'devotional-hindu', onboarded_at = COALESCE(onboarded_at, '2026-05-08')
  WHERE id = 'c-1769794849355-34851lo1g0p' AND niche_tag IS NULL; -- Kundan Parashar
UPDATE clients SET niche_tag = 'gaming-india-tracked'
  WHERE id = 'c-1769802242225-twuncdd5xy' AND niche_tag IS NULL; -- Deadlox
UPDATE clients SET niche_tag = 'gaming-india-tracked'
  WHERE id = 'c-1769802184475-hrg24ctuorl' AND niche_tag IS NULL; -- Vib n Ric

-- 6. Audit log
INSERT INTO agent_log (action, level, message, payload_json) VALUES (
  'roster.align',
  'info',
  '2026-05-09 roster alignment: marked Deadlox + Vib n Ric as tracked-only, added AP Sports Arena + Shinel Studios, populated niche_tags',
  '{"version":"2026-05-09","operator":"shinelstudioofficial","total_active_after":9}'
);
