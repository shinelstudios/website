-- Persist incoming /leads submissions to D1 (mirrored alongside the existing
-- KV-backed list). Lets the cockpit query / filter / report on leads as the
-- top-of-funnel grows past KV's array-value comfort zone, and gives every
-- lead a permanent audit trail.
-- 2026-05-17

CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,           -- "lead-<ts>-<rand>" from worker
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  handle          TEXT,                       -- IG/YT handle if they provided one
  source          TEXT DEFAULT 'wizard',      -- wizard | contact | exit-intent | …
  interests_json  TEXT DEFAULT '[]',          -- JSON array of strings
  quiz_data_json  TEXT,                       -- JSON blob from the quiz flow
  status          TEXT NOT NULL DEFAULT 'new',-- new | contacted | qualified | lost | closed
  notes           TEXT DEFAULT '',            -- internal notes
  assigned_to     TEXT,                       -- editor/admin email
  client_id       TEXT,                       -- once converted, link to clients(id)
  created_at      TEXT DEFAULT (datetime('now')),
  last_updated    TEXT DEFAULT (datetime('now')),
  contacted_at    TEXT,
  closed_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created    ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source     ON leads(source);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.leads_table',
  'info',
  '2026-05-17 created leads table — D1 mirror for /leads submissions',
  '{"version":"2026-05-17"}'
);
