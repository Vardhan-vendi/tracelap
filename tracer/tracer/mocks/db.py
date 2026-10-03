from __future__ import annotations
from typing import Callable, Optional, Dict, Any, List
import time
from tracer.schema import ExternalCallEvent

_db_event_callback: Optional[Callable[[ExternalCallEvent], None]] = None

def set_db_callback(cb: Optional[Callable[[ExternalCallEvent], None]]):
    global _db_event_callback
    _db_event_callback = cb

class MockDatabase:
    def __init__(self):
        self.reset()

    def reset(self):
        self.tables: Dict[str, List[Dict[str, Any]]] = {
            "users": [
                {"id": 1, "name": "Alice", "role": "admin", "score": 95},
                {"id": 2, "name": "Bob", "role": "student", "score": 82},
                {"id": 3, "name": "Charlie", "role": "student", "score": 88}
            ],
            "scores": [
                {"user_id": 1, "quiz": "Math", "points": 100},
                {"user_id": 2, "quiz": "Math", "points": 85}
            ]
        }

    def query(self, sql: str) -> List[Dict[str, Any]]:
        start_t = time.time()
        sql_clean = sql.strip()
        lower_sql = sql_clean.lower()
        matched_table = "users"
        for t in self.tables:
            if t in lower_sql:
                matched_table = t
                break

        results = [dict(row) for row in self.tables.get(matched_table, [])]
        if "where" in lower_sql and "role" in lower_sql:
            if "student" in lower_sql:
                results = [r for r in results if r.get("role") == "student"]
            elif "admin" in lower_sql:
                results = [r for r in results if r.get("role") == "admin"]

        duration = round((time.time() - start_t) * 1000, 2)
        event = ExternalCallEvent(
            kind="db",
            action="SELECT",
            target=matched_table,
            payload=sql_clean,
            result={"rows_returned": len(results), "rows": results[:5]},
            duration_ms=duration
        )
        if _db_event_callback:
            _db_event_callback(event)
        return results

    def insert(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        start_t = time.time()
        if table not in self.tables:
            self.tables[table] = []
        new_row = dict(row)
        if "id" not in new_row:
            new_row["id"] = len(self.tables[table]) + 1
        self.tables[table].append(new_row)

        duration = round((time.time() - start_t) * 1000, 2)
        event = ExternalCallEvent(
            kind="db",
            action="INSERT",
            target=table,
            payload=new_row,
            result={"status": "success", "inserted_id": new_row["id"]},
            duration_ms=duration
        )
        if _db_event_callback:
            _db_event_callback(event)
        return new_row

db = MockDatabase()
