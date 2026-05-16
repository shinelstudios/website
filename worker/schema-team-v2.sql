-- ============================================================================
-- schema-team-v2.sql — fix compensation model
-- 2026-05-09
-- ============================================================================
-- Reality: rates are project-wise (not editor-wise) for freelancers.
-- Salaried editors have a monthly amount and no per-project pay.
-- This adds the right fields and repositions payment_rate_inr as a "default
-- suggested rate" hint only.
--
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file schema-team-v2.sql
-- ============================================================================

-- editors gains compensation type + monthly salary
ALTER TABLE editors ADD COLUMN compensation_type TEXT DEFAULT 'freelance'; -- 'freelance' | 'salary'
ALTER TABLE editors ADD COLUMN monthly_salary_inr INTEGER DEFAULT 0;

-- projects gains per-project payment (for freelance assignments only)
ALTER TABLE projects ADD COLUMN editor_payment_inr INTEGER DEFAULT 0;

-- Audit
INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.team_v2',
  'info',
  '2026-05-09 added compensation_type + monthly_salary_inr to editors, editor_payment_inr to projects',
  '{"version":"2026-05-09","model":"freelance-per-project + salary-monthly"}'
);
