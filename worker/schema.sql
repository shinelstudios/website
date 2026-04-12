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
    instagram_handle TEXT,
    uploads_playlist_id TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    subscribers INTEGER DEFAULT 0,
    instagram_followers INTEGER DEFAULT 0,
    instagram_logo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Client Stats History (for growth tracking)
CREATE TABLE IF NOT EXISTS client_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    subscribers INTEGER DEFAULT 0,
    instagram_followers INTEGER DEFAULT 0,
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

-- Media Library (R2 + D1 backed)
CREATE TABLE IF NOT EXISTS media_library (
    id TEXT PRIMARY KEY,
    source_url TEXT,
    mirror_url TEXT, -- YouTube ID of the archived copy
    r2_key TEXT, -- Optional, can be NULL now
    title TEXT,
    thumbnail_url TEXT,
    type TEXT, -- 'video', 'image', 'other'
    category TEXT,
    status TEXT DEFAULT 'available', -- 'available', 'archiving', 'failed'
    metadata TEXT, -- JSON blob for extra info (size, dimensions, alt text)
    view_count INTEGER DEFAULT 0,
    duration TEXT,
    channel_title TEXT,
    last_metric_update DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unified Inventory: Videos
CREATE TABLE IF NOT EXISTS inventory_videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    kind TEXT, -- 'LONG', 'SHORT', 'REEL'
    tags TEXT, -- Comma separated or JSON
    primary_url TEXT,
    creator_url TEXT,
    video_id TEXT, -- YouTube Video ID
    youtube_views INTEGER DEFAULT 0,
    view_status TEXT,
    last_view_update DATETIME,
    attributed_to TEXT, -- User email
    is_shinel BOOLEAN DEFAULT 1,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Unified Inventory: Thumbnails
CREATE TABLE IF NOT EXISTS inventory_thumbnails (
    id TEXT PRIMARY KEY,
    filename TEXT,
    youtube_url TEXT,
    category TEXT,
    subcategory TEXT,
    variant TEXT, -- 'VIDEO', 'LIVE'
    image_url TEXT,
    video_id TEXT,
    youtube_views INTEGER DEFAULT 0,
    view_status TEXT,
    last_view_update DATETIME,
    attributed_to TEXT, -- User email
    is_shinel BOOLEAN DEFAULT 1,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Collections System
CREATE TABLE IF NOT EXISTS media_collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT, -- User email
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media_collection_items (
    collection_id TEXT,
    media_id TEXT, -- References media_library.id, inventory_videos.id, or inventory_thumbnails.id
    media_type TEXT, -- 'library', 'video', 'thumbnail'
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, media_id),
    FOREIGN KEY (collection_id) REFERENCES media_collections(id) ON DELETE CASCADE
);
