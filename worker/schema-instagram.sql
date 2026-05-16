-- ============================================================================
-- schema-instagram.sql — Instagram accounts per client
-- 2026-05-09
-- ============================================================================
-- Mirror of client_channels but for IG. One client can have multiple IG
-- handles (Kamz: 4-5, Shinel: 3, Kiaraa: 2). managed_by_us defaults to 0
-- because the majority of client IG accounts are NOT managed by Shinel —
-- we just track them. Set to 1 for the ones you actually publish to.
--
-- Apply:
--   cd worker && npx wrangler d1 execute shinel-db --remote --file schema-instagram.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_accounts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    handle TEXT NOT NULL,                       -- e.g. '@kamzinkzone' or 'kamzinkzone'
    url TEXT,                                   -- 'https://instagram.com/...'
    role TEXT DEFAULT 'main',                   -- 'main'|'secondary'|'reels-only'|'fan-page'|'business'
    managed_by_us INTEGER DEFAULT 0,            -- 1 if we publish/edit; 0 if we just track
    followers INTEGER DEFAULT 0,
    last_post_at DATETIME,
    business_account_linked INTEGER DEFAULT 0,  -- 1 once IG Business / Creator switch + FB Page link is done
    fb_page_id TEXT,                            -- once linked
    graph_token_kv_key TEXT,                    -- KV key holding the long-lived OAuth token
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Each handle should be unique (no two IG handles repeated across clients).
-- Note: NULL handle is unlikely but just-in-case the constraint allows it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_handle_unique ON instagram_accounts(handle) WHERE handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instagram_client_id ON instagram_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_instagram_managed   ON instagram_accounts(managed_by_us, active);

-- Seed: copy any existing clients.instagram_handle into the new table.
-- One row per client that has a non-empty instagram_handle. Status defaults
-- to managed_by_us=0 (you can flip to 1 in /dashboard/ops as needed).
INSERT OR IGNORE INTO instagram_accounts (id, client_id, handle, url, role, managed_by_us, notes)
SELECT
  'ig-seed-' || id,
  id,
  instagram_handle,
  'https://instagram.com/' || REPLACE(REPLACE(instagram_handle, '@', ''), ' ', ''),
  'main',
  COALESCE(managed_by_us, 1),
  'Seeded from clients.instagram_handle on 2026-05-09'
FROM clients
WHERE instagram_handle IS NOT NULL AND TRIM(instagram_handle) != '';

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.instagram_accounts',
  'info',
  'Created instagram_accounts table + seeded from clients.instagram_handle',
  '{"version":"2026-05-09"}'
);
