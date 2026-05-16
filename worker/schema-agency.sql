-- ============================================================================
-- schema-agency.sql — Agency Platform additions (Phase 1A)
-- 2026-05-09
-- ============================================================================
-- Purely additive. Apply AFTER worker/schema.sql. CREATE TABLE IF NOT EXISTS
-- only; the few ALTERs at the bottom add new columns to clients (idempotent-
-- by-convention as everywhere else in this codebase — re-running errors with
-- "duplicate column"; worker tolerates the missing-column case).
--
-- New tables back the agency-ops cockpit at /dashboard/ops + the per-client
-- research/RESEO/competitor pipelines we previously stored as JSON files in
-- the Cowork workspace folder. Migration script at
-- worker/migrations/agency-import.js ingests those files into these tables
-- (one-time, idempotent).
--
-- Apply locally first:
--   cd worker && npx wrangler d1 execute shinel-db --local --file schema-agency.sql
--
-- Apply to remote when ready:
--   cd worker && npx wrangler d1 execute shinel-db --remote --file schema-agency.sql
-- ============================================================================

-- Multi-channel support per client (Kamz: tattoo + tattoo-academy + Inkboy
-- Musik). clients.youtube_id stays as a denormalised pointer to role='main'.
CREATE TABLE IF NOT EXISTS client_channels (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    handle TEXT,
    url TEXT,
    role TEXT DEFAULT 'main',
    language TEXT,
    niche_tag_override TEXT,
    studio_url TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_channels_channel_id ON client_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_client_channels_client_id        ON client_channels(client_id);

-- Tracked competitors per client.
CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tier TEXT,
    niche_tag TEXT,
    initial_subs INTEGER,
    initial_video_count INTEGER,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_competitors_client_id  ON competitors(client_id);
CREATE INDEX IF NOT EXISTS idx_competitors_channel_id ON competitors(channel_id);

-- Daily competitor snapshots (delta + overperformer detection).
CREATE TABLE IF NOT EXISTS competitor_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    captured_date TEXT NOT NULL,
    subs INTEGER,
    video_count INTEGER,
    view_count INTEGER,
    recent_uploads_json TEXT,
    median_recent_views INTEGER,
    overperformers_json TEXT,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_comp_history_client_date    ON competitor_history(client_id, captured_date DESC);
CREATE INDEX IF NOT EXISTS idx_comp_history_channel_date   ON competitor_history(channel_id, captured_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_history_dedup
  ON competitor_history(client_id, channel_id, captured_date);

-- SEO history (RESEO audit trail). Replaces clients/<id>/seo-history.jsonl.
CREATE TABLE IF NOT EXISTS seo_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    video_id TEXT,
    action TEXT NOT NULL,
    old_title TEXT,
    old_description_first_line TEXT,
    old_tags_count INTEGER,
    old_tags_chars INTEGER,
    new_title TEXT,
    new_description_first_line TEXT,
    new_tags_count INTEGER,
    new_tags_chars INTEGER,
    changes_summary TEXT,
    approved_by TEXT,
    applied_method TEXT,
    applied INTEGER DEFAULT 0,
    applied_at DATETIME,
    verified_via TEXT,
    notes TEXT,
    payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_seo_history_client_created  ON seo_history(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_history_video_id        ON seo_history(video_id) WHERE video_id IS NOT NULL;

-- Daily research output per client. Replaces clients/<id>/research/<date>.md.
CREATE TABLE IF NOT EXISTS daily_research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    research_date TEXT NOT NULL,
    schema_version INTEGER DEFAULT 2,
    content_md TEXT NOT NULL,
    health_score INTEGER,
    content_menu_json TEXT,
    trending_keywords_json TEXT,
    alerts_json TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_research_client_date
  ON daily_research(client_id, research_date);
CREATE INDEX IF NOT EXISTS idx_daily_research_date_desc ON daily_research(research_date DESC);

-- News spikes (patch days, tournaments, releases).
CREATE TABLE IF NOT EXISTS news_spikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    niche_tag TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sources_json TEXT,
    spike_score INTEGER,
    trend_window_start TEXT,
    trend_window_end TEXT,
    affected_client_ids_json TEXT,
    content_ideas_json TEXT,
    status TEXT DEFAULT 'active',
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_spikes_niche_active
  ON news_spikes(niche_tag, status, detected_at DESC);

-- Granular agent activity log (different from audit_logs which is HTTP-level).
CREATE TABLE IF NOT EXISTS agent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    client_id TEXT,
    level TEXT DEFAULT 'info',
    message TEXT,
    payload_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_log_created_at      ON agent_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_log_client_created  ON agent_log(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_log_action_level    ON agent_log(action, level);

-- Project / task management (Notion-inspired kanban).
CREATE TABLE IF NOT EXISTS editors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT,
    skills_json TEXT,
    payment_rate_inr INTEGER DEFAULT 0,
    payment_per TEXT DEFAULT 'video',
    bank_details_json TEXT,
    active INTEGER DEFAULT 1,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_editors_email_active ON editors(email, active);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    title TEXT NOT NULL,
    asset_type TEXT,
    status TEXT DEFAULT 'idea',
    assigned_editor_id TEXT,
    brief_md TEXT,
    due_date TEXT,
    scheduled_publish_at DATETIME,
    youtube_video_id TEXT,
    instagram_post_id TEXT,
    tags_json TEXT,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    archived_at DATETIME,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(assigned_editor_id) REFERENCES editors(id)
);
CREATE INDEX IF NOT EXISTS idx_projects_client_status     ON projects(client_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_editor            ON projects(assigned_editor_id);
CREATE INDEX IF NOT EXISTS idx_projects_scheduled_publish ON projects(scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated    ON projects(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    assignee_email TEXT,
    priority INTEGER DEFAULT 0,
    due_date TEXT,
    notes TEXT,
    blocking_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status  ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_email, status);

-- Cross-platform content calendar.
CREATE TABLE IF NOT EXISTS content_calendar (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    project_id TEXT,
    platform TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    status TEXT DEFAULT 'planned',
    payload_json TEXT,
    published_at DATETIME,
    publish_url TEXT,
    error_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_calendar_client_scheduled ON content_calendar(client_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_calendar_status_scheduled ON content_calendar(status, scheduled_at);

-- Finance: invoices.
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    period_start TEXT,
    period_end TEXT,
    line_items_json TEXT NOT NULL,
    subtotal_inr INTEGER DEFAULT 0,
    gst_inr INTEGER DEFAULT 0,
    total_inr INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'draft',
    due_date TEXT,
    sent_at DATETIME,
    paid_at DATETIME,
    pdf_kv_key TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date      ON invoices(due_date);

-- Finance: editor payments.
CREATE TABLE IF NOT EXISTS editor_payments (
    id TEXT PRIMARY KEY,
    editor_id TEXT NOT NULL,
    project_id TEXT,
    period_start TEXT,
    period_end TEXT,
    description TEXT,
    amount_inr INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at DATETIME,
    payment_method TEXT,
    transaction_ref TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(editor_id) REFERENCES editors(id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_editor_payments_editor_status ON editor_payments(editor_id, status);
CREATE INDEX IF NOT EXISTS idx_editor_payments_period        ON editor_payments(period_start, period_end);

-- Niche calendars (replaces lib/calendars/<niche>.md files).
CREATE TABLE IF NOT EXISTS niche_calendars (
    niche_tag TEXT PRIMARY KEY,
    config_md TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add agency-related columns to existing clients table.
-- Idempotent-by-convention; re-running errors with "duplicate column" — the
-- worker tolerates the missing-column case.
ALTER TABLE clients ADD COLUMN niche_tag TEXT;
ALTER TABLE clients ADD COLUMN secondary_niche_tag TEXT;
ALTER TABLE clients ADD COLUMN soul_id TEXT;
ALTER TABLE clients ADD COLUMN brand_kit_json TEXT;
ALTER TABLE clients ADD COLUMN onboarded_at DATETIME;
ALTER TABLE clients ADD COLUMN retainer_tier TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_niche_tag ON clients(niche_tag);
