-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'client',
    first_name TEXT,
    last_name TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients/Creators Registry
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- Link to users table if they have a login
    name TEXT NOT NULL,
    youtube_id TEXT UNIQUE,
    handle TEXT,
    uploads_playlist_id TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Client Stats History (for growth tracking)
CREATE TABLE IF NOT EXISTS client_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    subscribers INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Pulse Activities (Relational storage)
CREATE TABLE IF NOT EXISTS pulse_activities (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    youtube_video_id TEXT UNIQUE NOT NULL,
    title TEXT,
    thumbnail TEXT,
    url TEXT,
    published_at TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- System Logs / Audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    user_id TEXT,
    details TEXT,
    ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
