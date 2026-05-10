-- ============================================================================
-- laptop-queue-2026-05-10.sql
-- ============================================================================
-- Task queue for the always-on laptop running Claude Code/Cowork.
-- Worker enqueues tasks; laptop polls + claims + executes + completes.
--
-- Apply: cd worker && npx wrangler d1 execute shinel-db --remote --file migrations/laptop-queue-2026-05-10.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS laptop_tasks (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,           -- e.g. 'ig_followers_fetch', 'yt_reseo', 'higgsfield_gen'
  client_id       TEXT,                    -- optional FK to clients
  payload_json    TEXT,                    -- task-specific input
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | claimed | done | failed | cancelled
  priority        INTEGER NOT NULL DEFAULT 0,        -- higher runs first
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  result_json     TEXT,
  error           TEXT,
  scheduled_for   INTEGER,                 -- unix sec; if set, don't run before this
  claimed_at      INTEGER,
  completed_at    INTEGER,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      TEXT                     -- 'cron', 'admin@email', etc
);

CREATE INDEX IF NOT EXISTS idx_laptop_tasks_status_priority
  ON laptop_tasks(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_laptop_tasks_client
  ON laptop_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_laptop_tasks_type
  ON laptop_tasks(type);

-- Track laptop heartbeat — knowing whether the laptop is online matters
-- when deciding whether to enqueue user-blocking tasks.
CREATE TABLE IF NOT EXISTS laptop_heartbeats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  laptop_id       TEXT NOT NULL,           -- e.g. 'shinel-main' (set in env or prompt)
  version         TEXT,                    -- skill version
  last_seen       INTEGER NOT NULL,        -- unix sec
  pending_count   INTEGER DEFAULT 0,       -- how many tasks were waiting when laptop checked
  payload_json    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_laptop_heartbeats_unique ON laptop_heartbeats(laptop_id);

INSERT INTO agent_log (action, level, message, payload_json)
VALUES (
  'schema.laptop_queue',
  'info',
  '2026-05-10 added laptop_tasks + laptop_heartbeats tables for hybrid worker/laptop pipeline',
  '{"version":"2026-05-10"}'
);
