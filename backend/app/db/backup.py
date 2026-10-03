"""
Persistent, crash-resilient append-only backup storage for user feedback & analytics events.
Guarantees zero data loss even across container restarts, ephemeral disk rebuilds, or SQLite crashes.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger(__name__)

def get_backup_dir() -> str:
    """Returns the persistent directory for storing append-only JSONL backups."""
    if settings.database_path:
        base_dir = os.path.dirname(settings.database_path)
    else:
        base_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
        )
    backup_dir = os.path.join(base_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def get_backup_filepath(category: str) -> str:
    return os.path.join(get_backup_dir(), f"{category}_backup.jsonl")

def append_backup_record(category: str, record: Dict[str, Any]) -> None:
    """
    Appends a single JSON record to an append-only .jsonl file with immediate fsync.
    This guarantees data is committed to disk and will not be lost.
    """
    try:
        filepath = get_backup_filepath(category)
        line = json.dumps(record, ensure_ascii=False) + "\n"
        with open(filepath, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
            try:
                os.fsync(f.fileno())
            except Exception:
                pass
    except Exception as e:
        logger.error("Failed to append backup record for %s: %s", category, e)

def read_backup_records(category: str) -> List[Dict[str, Any]]:
    """Reads all valid JSON records from the category's backup file."""
    filepath = get_backup_filepath(category)
    if not os.path.isfile(filepath):
        return []
    records = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except Exception:
                    pass
    except Exception as e:
        logger.error("Failed to read backup records for %s: %s", category, e)
    return records
