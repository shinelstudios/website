-- Featured flag on clients — pins them to the top of the homepage
-- OurCreatorsHero trophy wall. Tagline + display_name already exist on
-- the schema (added in Phase 2 portal migration).
-- 2026-05-17

ALTER TABLE clients ADD COLUMN featured INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_featured
  ON clients(featured, status);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.client_featured',
  'info',
  '2026-05-17 added clients.featured for homepage hero pinning',
  '{"version":"2026-05-17"}'
);
