"""Database operations for user feedback."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.app.db.database import get_connection

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
