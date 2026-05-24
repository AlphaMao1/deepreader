CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    cover_path TEXT,
    file_size INTEGER NOT NULL,
    language TEXT NOT NULL,
    tags TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT,
    metadata TEXT NOT NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_status (
    book_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    progress_current INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    location TEXT,
    last_read_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration_seconds INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT,
    book_meta TEXT,
    title TEXT,
    content TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS book_notes (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL,
    type TEXT NOT NULL,
    cfi TEXT NOT NULL,
    text TEXT,
    style TEXT,
    color TEXT,
    note TEXT NOT NULL,
    context_before TEXT,
    context_after TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active INTEGER DEFAULT 1,
    is_system INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS user_memories (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    source_type TEXT,
    source_id TEXT,
    book_id TEXT,
    related_memory_ids TEXT,
    confidence REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER DEFAULT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_deleted_at ON books(deleted_at);
CREATE INDEX IF NOT EXISTS idx_books_sync_status ON books(sync_status);

CREATE INDEX IF NOT EXISTS idx_threads_book_id ON threads(book_id);

CREATE INDEX IF NOT EXISTS idx_book_status_status ON book_status(status);
CREATE INDEX IF NOT EXISTS idx_book_status_progress ON book_status(progress_current, progress_total);
CREATE INDEX IF NOT EXISTS idx_book_status_location ON book_status(location);
CREATE INDEX IF NOT EXISTS idx_book_status_last_read ON book_status(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_status_updated_at ON book_status(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_status_deleted_at ON book_status(deleted_at);
CREATE INDEX IF NOT EXISTS idx_book_status_sync_status ON book_status(sync_status);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_started_at ON reading_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(DATE(started_at/1000, 'unixepoch'));
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_date ON reading_sessions(book_id, DATE(started_at/1000, 'unixepoch'));
CREATE INDEX IF NOT EXISTS idx_reading_sessions_deleted_at ON reading_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_sync_status ON reading_sessions(sync_status);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_active_name_unique ON tags(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tags_updated_at ON tags(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status);

CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_sync_status ON notes(sync_status);

CREATE INDEX IF NOT EXISTS idx_book_notes_book_id ON book_notes(book_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_type ON book_notes(type);
CREATE INDEX IF NOT EXISTS idx_book_notes_created_at ON book_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_notes_cfi ON book_notes(cfi);
CREATE INDEX IF NOT EXISTS idx_book_notes_deleted_at ON book_notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_book_notes_sync_status ON book_notes(sync_status);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_active_name_unique ON skills(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_skills_is_active ON skills(is_active);
CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_deleted_at ON skills(deleted_at);
CREATE INDEX IF NOT EXISTS idx_skills_sync_status ON skills(sync_status);

CREATE INDEX IF NOT EXISTS idx_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_book_id ON user_memories(book_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON user_memories(key);
CREATE INDEX IF NOT EXISTS idx_memories_access ON user_memories(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_memories_deleted_at ON user_memories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_memories_sync_status ON user_memories(sync_status);
