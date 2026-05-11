-- Personal todo list (owner-only, private Discord pings)
-- 2026-05-11

CREATE TABLE IF NOT EXISTS personal_todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',        -- low | normal | high | urgent
  status TEXT DEFAULT 'open',            -- open | in_progress | done | cancelled
  due_date TEXT,                         -- ISO date YYYY-MM-DD or full ISO
  snooze_until TEXT,                     -- ISO timestamp; suppresses pings until then
  recurring_pattern TEXT,                -- daily | weekdays | weekly | monthly | null
  recurring_anchor TEXT,                 -- when recurrence started (ISO)
  linked_project_id INTEGER,
  linked_client_id INTEGER,
  tags TEXT DEFAULT '',                  -- comma separated
  last_ping_at TEXT,                     -- last time Discord ping fired
  last_ping_reason TEXT,                 -- 'overdue' | 'due_today' | 'reminder' | 'upcoming'
  ping_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_personal_todos_owner ON personal_todos(owner_email);
CREATE INDEX IF NOT EXISTS idx_personal_todos_status ON personal_todos(status);
CREATE INDEX IF NOT EXISTS idx_personal_todos_due ON personal_todos(due_date);

-- Owner private Discord webhook routing (per-user; falls back to env DISCORD_OWNER_WEBHOOK_URL)
CREATE TABLE IF NOT EXISTS owner_webhooks (
  owner_email TEXT PRIMARY KEY,
  webhook_url TEXT NOT NULL,
  discord_user_id TEXT,                  -- so we can @mention in the ping
  quiet_hours_start INTEGER DEFAULT 23,  -- 24h, skip pings between start/end (IST)
  quiet_hours_end INTEGER DEFAULT 7,
  daily_digest_hour INTEGER DEFAULT 8,   -- IST hour to send morning digest
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
