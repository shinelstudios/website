-- Sponsorship admin pipeline — adds a status lifecycle to client_inbox rows.
--
-- The /api/c/:slug/sponsor endpoint already writes sponsor inquiries into
-- client_inbox (type='sponsor'). They just sit there with no admin view.
-- This migration adds status + notes + assigned_to so the cockpit Growth
-- tab can manage them like a deal pipeline:
--
--   new → outreach → negotiating → signed → invoiced → paid    (won path)
--                                       \__ declined / ghosted (lost path)
--
-- Status default is 'new' so existing rows are immediately usable.
-- Applied 2026-05-17.

ALTER TABLE client_inbox ADD COLUMN status TEXT DEFAULT 'new';
ALTER TABLE client_inbox ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE client_inbox ADD COLUMN assigned_to TEXT;
ALTER TABLE client_inbox ADD COLUMN value_inr INTEGER;
ALTER TABLE client_inbox ADD COLUMN updated_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_client_inbox_type_status
  ON client_inbox(type, status, created_at DESC);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.sponsorship_pipeline',
  'info',
  '2026-05-17 added status / notes / value_inr to client_inbox for sponsorship admin',
  '{"version":"2026-05-17"}'
);
