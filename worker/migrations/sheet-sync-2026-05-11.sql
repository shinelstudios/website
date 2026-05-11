-- Track which sheet rows we created so we never touch the founder's manual rows.
-- Idempotency: a project's first sync APPENDS a new row; subsequent syncs UPDATE
-- only that row (matched by sheet_row_index). Manual rows have NULL here forever.
-- 2026-05-11

ALTER TABLE projects ADD COLUMN sheet_row_index INTEGER;     -- 1-based row in the tab
ALTER TABLE projects ADD COLUMN sheet_tab_name TEXT;          -- e.g. "May 2026"
ALTER TABLE projects ADD COLUMN sheet_synced_at TEXT;         -- ISO timestamp of last write
ALTER TABLE projects ADD COLUMN sheet_sync_error TEXT;        -- last error if any

CREATE INDEX IF NOT EXISTS idx_projects_sheet_synced ON projects(sheet_synced_at) WHERE sheet_synced_at IS NOT NULL;
