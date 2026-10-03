"""Database initialization and connection management for CodeLearner."""
import os
import sqlite3
import tempfile
import logging
from typing import Generator
from backend.app.config import settings

logger = logging.getLogger(__name__)

def get_db_path() -> str:
    if settings.database_path:
        db_path = settings.database_path
    elif os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        db_path = os.path.join(tempfile.gettempdir(), "codelearner_data", "codelearner.db")
    else:
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(backend_dir, "data", "codelearner.db")
    
    # Ensure directory exists with fallback to /tmp if read-only
    db_dir = os.path.dirname(db_path)
    try:
        os.makedirs(db_dir, exist_ok=True)
    except OSError:
        db_path = os.path.join(tempfile.gettempdir(), "codelearner_data", "codelearner.db")
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
    return db_path

_db_initialized = False

def init_db() -> None:
    global _db_initialized
    try:
        db_path = get_db_path()
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        with sqlite3.connect(db_path, timeout=10.0) as conn:
            try:
                conn.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                try:
                    conn.execute("PRAGMA journal_mode=DELETE;")
                except Exception:
                    pass
            conn.execute("PRAGMA busy_timeout = 5000;")
        
        # Feedback table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                message TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('GENERAL', 'BUG', 'FEATURE')),
                name TEXT,
                role TEXT,
                screenshot_url TEXT,
                profile_url TEXT,
                display_permission INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
        """)
        
        # Analytics events table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analytics_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                session_id TEXT NOT NULL,
                page TEXT NOT NULL DEFAULT '/',
                feature TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL
            );
        """)
        
        # Indexes for optimized dashboard queries
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON feedbacks(type);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON feedbacks(rating);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_display ON feedbacks(display_permission);")
        
        conn.commit()
        _db_initialized = True
    except Exception as e:
        logger.warning("Database initialization deferred or failed: %s", e)

def get_connection() -> sqlite3.Connection:
    global _db_initialized
    if not _db_initialized:
        init_db()
    conn = sqlite3.connect(get_db_path(), timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
