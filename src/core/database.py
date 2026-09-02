"""SQLite database for clients, projects, documents, and tags."""

import sqlite3
from pathlib import Path

DB_PATH = Path("data/platform.db")


def get_db() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            client_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            collection TEXT DEFAULT 'pe_documents',
            chunks INTEGER DEFAULT 0,
            summary TEXT DEFAULT '',
            doc_type TEXT DEFAULT '',
            client_id INTEGER,
            project_id INTEGER,
            source TEXT DEFAULT 'upload',
            onedrive_id TEXT,
            onedrive_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT DEFAULT '#80988f'
        );

        CREATE TABLE IF NOT EXISTS document_tags (
            document_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (document_id, tag_id),
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS onedrive_tokens (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            access_token TEXT,
            refresh_token TEXT,
            expires_at TEXT,
            user_email TEXT,
            connected_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.close()


# Auto-init on import
init_db()
