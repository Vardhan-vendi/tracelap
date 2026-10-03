"""Database operations for user feedback with dual-persistence (SQLite + JSONL Backup + MongoDB Atlas)."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.app.db.database import get_connection
from backend.app.db.backup import append_backup_record
from backend.app.db.mongo import get_mongo_db, is_mongo_active

VALID_FEEDBACK_TYPES = {"GENERAL", "BUG", "FEATURE"}

def sanitize_text(text: Optional[str], max_length: int = 2000) -> Optional[str]:
    if text is None:
        return None
    cleaned = text.strip()
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned

def create_feedback(
    rating: int,
    message: str,
    feedback_type: str,
    name: Optional[str] = None,
    role: Optional[str] = None,
    screenshot_url: Optional[str] = None,
    profile_url: Optional[str] = None,
    display_permission: bool = False,
) -> Dict[str, Any]:
    if not (1 <= rating <= 5):
        raise ValueError("Rating must be between 1 and 5")
    
    clean_type = feedback_type.upper().strip() if feedback_type else "GENERAL"
    if clean_type not in VALID_FEEDBACK_TYPES:
        raise ValueError(f"Invalid feedback type: {feedback_type}. Must be GENERAL, BUG, or FEATURE.")
    
    clean_message = sanitize_text(message, max_length=3000)
    if not clean_message:
        raise ValueError("Message cannot be empty")
    
    clean_name = sanitize_text(name, max_length=100)
    clean_role = sanitize_text(role, max_length=100)
    clean_profile = sanitize_text(profile_url, max_length=255)
    clean_screenshot = sanitize_text(screenshot_url, max_length=500)
    created_at = datetime.now(timezone.utc).isoformat()
    
    # 1. Insert into local SQLite database
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO feedbacks (
                rating, message, type, name, role, screenshot_url, profile_url, display_permission, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rating,
                clean_message,
                clean_type,
                clean_name,
                clean_role,
                clean_screenshot,
                clean_profile,
                1 if display_permission else 0,
                created_at,
            ),
        )
        feedback_id = cursor.lastrowid
        conn.commit()

    record_dict = {
        "id": feedback_id,
        "rating": rating,
        "message": clean_message,
        "type": clean_type,
        "name": clean_name,
        "role": clean_role,
        "screenshot_url": clean_screenshot,
        "profile_url": clean_profile,
        "display_permission": 1 if display_permission else 0,
        "created_at": created_at,
    }

    # 2. Append-only persistent JSONL disk backup (Never loses data)
    append_backup_record("feedbacks", record_dict)

    # 3. Cloud persistence in MongoDB Atlas if enabled
    if is_mongo_active():
        try:
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                mongo_doc = {**record_dict, "id": str(feedback_id)}
                mongo_db.feedbacks.insert_one(mongo_doc)
        except Exception:
            pass

    return {
        "id": feedback_id,
        "rating": rating,
        "message": clean_message,
        "type": clean_type,
        "name": clean_name,
        "role": clean_role,
        "screenshotUrl": clean_screenshot,
        "profileUrl": clean_profile,
        "displayPermission": bool(display_permission),
        "createdAt": created_at,
    }

def get_feedbacks(
    feedback_type: Optional[str] = None,
    rating: Optional[int] = None,
    start_time: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    # Query MongoDB Atlas if active
    if is_mongo_active():
        try:
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                query: Dict[str, Any] = {}
                if feedback_type and feedback_type.upper() in VALID_FEEDBACK_TYPES:
                    query["type"] = feedback_type.upper()
                if rating is not None and 1 <= rating <= 5:
                    query["rating"] = rating
                if start_time:
                    query["created_at"] = {"$gte": start_time}

                total_count = mongo_db.feedbacks.count_documents(query)
                cursor = (
                    mongo_db.feedbacks.find(query)
                    .sort("created_at", -1)
                    .skip(offset)
                    .limit(limit)
                )

                items = []
                for doc in cursor:
                    items.append({
                        "id": doc.get("id", str(doc.get("_id"))),
                        "rating": doc.get("rating"),
                        "message": doc.get("message"),
                        "type": doc.get("type"),
                        "name": doc.get("name"),
                        "role": doc.get("role"),
                        "screenshotUrl": doc.get("screenshot_url") or doc.get("screenshotUrl"),
                        "profileUrl": doc.get("profile_url") or doc.get("profileUrl"),
                        "displayPermission": bool(doc.get("display_permission") or doc.get("displayPermission")),
                        "createdAt": doc.get("created_at") or doc.get("createdAt"),
                    })

                return {
                    "items": items,
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                }
        except Exception:
            pass  # Fall back to SQLite on any error

    # Fallback to SQLite
    conditions = []
    params: List[Any] = []
    
    if feedback_type and feedback_type.upper() in VALID_FEEDBACK_TYPES:
        conditions.append("type = ?")
        params.append(feedback_type.upper())
    
    if rating is not None and 1 <= rating <= 5:
        conditions.append("rating = ?")
        params.append(rating)
        
    if start_time:
        conditions.append("created_at >= ?")
        params.append(start_time)
        
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Total matching
        count_query = f"SELECT COUNT(*) FROM feedbacks {where_clause}"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        # Paginated items
        items_query = f"""
            SELECT id, rating, message, type, name, role, screenshot_url, profile_url, display_permission, created_at
            FROM feedbacks
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """
        cursor.execute(items_query, params + [limit, offset])
        rows = cursor.fetchall()
        
        items = []
        for r in rows:
            items.append({
                "id": r["id"],
                "rating": r["rating"],
                "message": r["message"],
                "type": r["type"],
                "name": r["name"],
                "role": r["role"],
                "screenshotUrl": r["screenshot_url"],
                "profileUrl": r["profile_url"],
                "displayPermission": bool(r["display_permission"]),
                "createdAt": r["created_at"],
            })
            
    return {
        "items": items,
        "total": total_count,
        "limit": limit,
        "offset": offset,
    }

def get_public_feedbacks(limit: int = 20) -> List[Dict[str, Any]]:
    if is_mongo_active():
        try:
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                cursor = (
                    mongo_db.feedbacks.find({"display_permission": 1})
                    .sort("created_at", -1)
                    .limit(limit)
                )
                return [
                    {
                        "id": doc.get("id", str(doc.get("_id"))),
                        "rating": doc.get("rating"),
                        "message": doc.get("message"),
                        "type": doc.get("type"),
                        "name": doc.get("name") or "Anonymous User",
                        "role": doc.get("role") or "Learner",
                        "createdAt": doc.get("created_at") or doc.get("createdAt"),
                    }
                    for doc in cursor
                ]
        except Exception:
            pass

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, rating, message, type, name, role, created_at
            FROM feedbacks
            WHERE display_permission = 1
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "rating": r["rating"],
                "message": r["message"],
                "type": r["type"],
                "name": r["name"] or "Anonymous User",
                "role": r["role"] or "Learner",
                "createdAt": r["created_at"],
            }
            for r in rows
        ]
