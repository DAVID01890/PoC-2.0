CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'developer',
    is_active INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT,
    avatar TEXT
);
"""
