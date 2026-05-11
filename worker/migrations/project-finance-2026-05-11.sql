-- ============================================================================
-- project-finance-2026-05-11.sql — track BOTH sides of the money flow per project
-- ============================================================================
-- Today projects have only editor_payment_inr (what we PAY out).
-- Adding client_charge_inr (what we CHARGE the client) so margin per project
-- is visible. Also adding currency for future multi-currency support.
-- ============================================================================

ALTER TABLE projects ADD COLUMN client_charge_inr INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN currency TEXT DEFAULT 'INR';

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.project_finance',
  'info',
  '2026-05-11 added projects.client_charge_inr + currency',
  '{"version":"2026-05-11"}'
);
