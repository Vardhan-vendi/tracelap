"""Database initialization and connection management for TRACELAP."""
import os
import sqlite3
import tempfile
import logging
from typing import Generator
from backend.app.config import settings
from backend.app.db.backup import (
    get_backup_dir,
    append_backup_record,
    read_backup_records,
)
from backend.app.db.mongo import get_mongo_db, is_mongo_active

logger = logging.getLogger(__name__)

def get_db_path() -> str:
    if settings.database_path:
        db_path = settings.database_path
    elif os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        db_path = os.path.join(tempfile.gettempdir(), "tracelap_data", "tracelap.db")
    else:
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(backend_dir, "data", "tracelap.db")
        
        # If legacy codelearner.db exists and tracelap.db does not, migrate it over immediately
        old_db_path = os.path.join(backend_dir, "data", "codelearner.db")
        if os.path.isfile(old_db_path) and not os.path.isfile(db_path):
            try:
                import shutil
                shutil.copy2(old_db_path, db_path)
            except Exception:
                pass
    
    # Ensure directory exists with fallback to /tmp if read-only
    db_dir = os.path.dirname(db_path)
    try:
        os.makedirs(db_dir, exist_ok=True)
    except OSError:
        db_path = os.path.join(tempfile.gettempdir(), "tracelap_data", "tracelap.db")
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

            # --- Persistent Backup & Recovery Sync ---
            # 1. Back up existing SQLite records to JSONL if backup files don't have them
            try:
                fb_backup = read_backup_records("feedbacks")
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM feedbacks")
                fb_count = cur.fetchone()[0]
                if fb_count > 0 and len(fb_backup) == 0:
                    cur.execute("SELECT * FROM feedbacks ORDER BY id ASC")
                    for row in cur.fetchall():
                        append_backup_record("feedbacks", dict(row))
                elif fb_count == 0 and len(fb_backup) > 0:
                    # Restore from backup into empty SQLite database
                    for r in fb_backup:
                        cur.execute(
                            """
                            INSERT OR IGNORE INTO feedbacks (
                                rating, message, type, name, role, screenshot_url, profile_url, display_permission, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                r.get("rating", 5),
                                r.get("message", ""),
                                r.get("type", "GENERAL"),
                                r.get("name"),
                                r.get("role"),
                                r.get("screenshot_url") or r.get("screenshotUrl"),
                                r.get("profile_url") or r.get("profileUrl"),
                                1 if r.get("display_permission") or r.get("displayPermission") else 0,
                                r.get("created_at") or r.get("createdAt", ""),
                            ),
                        )
                    conn.commit()

                # Analytics backup & restore
                ev_backup = read_backup_records("analytics_events")
                cur.execute("SELECT COUNT(*) FROM analytics_events")
                ev_count = cur.fetchone()[0]
                if ev_count > 0 and len(ev_backup) == 0:
                    cur.execute("SELECT * FROM analytics_events ORDER BY id ASC")
                    for row in cur.fetchall():
                        append_backup_record("analytics_events", dict(row))
                elif ev_count == 0 and len(ev_backup) > 0:
                    for r in ev_backup:
                        cur.execute(
                            """
                            INSERT OR IGNORE INTO analytics_events (
                                event_type, session_id, page, feature, metadata, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?)
                            """,
                            (
                                r.get("event_type") or r.get("eventType", "PAGE_VIEW"),
                                r.get("session_id") or r.get("sessionId", "anonymous"),
                                r.get("page", "/"),
                                r.get("feature"),
                                r.get("metadata") if isinstance(r.get("metadata"), str) else None,
                                r.get("created_at") or r.get("createdAt", ""),
                            ),
                        )
                    conn.commit()
            except Exception as backup_err:
                logger.warning("Auto backup/recovery check skipped: %s", backup_err)

        _db_initialized = True
        
        # --- Check and sync with MongoDB Atlas if enabled ---
        if settings.mongodb_uri:
            try:
                mongo_db = get_mongo_db()
                if mongo_db is not None:
                    _sync_to_mongo_if_needed(mongo_db)
            except Exception as mongo_err:
                logger.warning("MongoDB Atlas initial sync skipped: %s", mongo_err)
                
    except Exception as e:
        logger.warning("Database initialization deferred or failed: %s", e)

def _sync_to_mongo_if_needed(mongo_db) -> None:
    """Syncs local SQLite/backup records into MongoDB Atlas if Atlas collections are empty."""
    try:
        if mongo_db.feedbacks.count_documents({}) == 0:
            fb_records = read_backup_records("feedbacks")
            if fb_records:
                mongo_db.feedbacks.insert_many(fb_records)
                logger.info("Synced %d local feedback records to MongoDB Atlas.", len(fb_records))
        
        if mongo_db.analytics_events.count_documents({}) == 0:
            ev_records = read_backup_records("analytics_events")
            if ev_records:
                mongo_db.analytics_events.insert_many(ev_records)
                logger.info("Synced %d local analytics records to MongoDB Atlas.", len(ev_records))
    except Exception as e:
        logger.warning("Failed to sync to MongoDB Atlas: %s", e)

def get_connection() -> sqlite3.Connection:
    global _db_initialized
    if not _db_initialized:
        init_db()
    conn = sqlite3.connect(get_db_path(), timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
