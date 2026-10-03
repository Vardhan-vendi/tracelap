"""Database operations for product analytics with dual-persistence (SQLite + JSONL Backup + MongoDB Atlas)."""
import re
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from backend.app.db.database import get_connection
from backend.app.db.backup import append_backup_record
from backend.app.db.mongo import get_mongo_db, is_mongo_active

def clean_event_type(event_type: str) -> str:
    """Normalizes event type safely while preserving genuine user interaction types."""
    if not event_type or not str(event_type).strip():
        return "PAGE_VIEW"
    clean = str(event_type).upper().strip()
    clean = re.sub(r'[\s\-]+', '_', clean)
    clean = re.sub(r'[^A-Z0-9_]', '', clean)[:50]
    return clean or "PAGE_VIEW"

def record_event(
    event_type: str,
    session_id: str,
    page: str = "/",
    feature: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    clean_type = clean_event_type(event_type)
    clean_session_id = (session_id or "anonymous").strip()[:100]
    clean_page = (page or "/")[:200]
    clean_feature = (feature.strip()[:100]) if feature else None
    
    # Sanitize metadata: remove potentially large or sensitive values
    safe_metadata = {}
    if isinstance(metadata, dict):
        for k, v in metadata.items():
            if k.lower() in ("code", "password", "token", "key", "secret"):
                continue  # Never store raw user code or secrets
            if isinstance(v, (str, int, float, bool)) or v is None:
                safe_metadata[k] = v
            elif isinstance(v, (list, dict)):
                try:
                    s = json.dumps(v)
                    if len(s) < 500:
                        safe_metadata[k] = v
                except Exception:
                    pass
                    
    metadata_json = json.dumps(safe_metadata) if safe_metadata else None
    created_at = datetime.now(timezone.utc).isoformat()
    
    # 1. SQLite storage
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO analytics_events (
                event_type, session_id, page, feature, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (clean_type, clean_session_id, clean_page, clean_feature, metadata_json, created_at),
        )
        conn.commit()
        event_id = cursor.lastrowid or 0

    record_dict = {
        "id": event_id,
        "event_type": clean_type,
        "session_id": clean_session_id,
        "page": clean_page,
        "feature": clean_feature,
        "metadata": safe_metadata if safe_metadata else None,
        "created_at": created_at,
    }

    # 2. Append-only persistent JSONL disk backup (Never loses data)
    append_backup_record("analytics_events", record_dict)

    # 3. Cloud persistence in MongoDB Atlas if enabled
    if is_mongo_active():
        try:
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                mongo_db.analytics_events.insert_one(record_dict)
        except Exception:
            pass

    return event_id

def _get_time_filter(date_range: str) -> Optional[str]:
    now = datetime.now(timezone.utc)
    if date_range == "today":
        start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        return start_of_day.isoformat()
    elif date_range == "7d":
        return (now - timedelta(days=7)).isoformat()
    elif date_range == "30d":
        return (now - timedelta(days=30)).isoformat()
    return None

def _get_analytics_summary_mongo(mongo_db, date_range: str) -> Dict[str, Any]:
    """Calculates summary KPIs and distributions from MongoDB Atlas."""
    time_filter = _get_time_filter(date_range)
    time_query = {"created_at": {"$gte": time_filter}} if time_filter else {}
    
    # 1. Visitors & core events
    total_visitors = len(mongo_db.analytics_events.distinct("session_id", time_query))
    page_views = mongo_db.analytics_events.count_documents({**time_query, "event_type": "PAGE_VIEW"})
    code_runs = mongo_db.analytics_events.count_documents({**time_query, "event_type": "CODE_RUN"})
    trace_sessions = mongo_db.analytics_events.count_documents({**time_query, "event_type": "TRACE_STARTED"})
    executions_success = mongo_db.analytics_events.count_documents({**time_query, "event_type": "CODE_EXECUTION_SUCCESS"})
    executions_error = mongo_db.analytics_events.count_documents({**time_query, "event_type": "CODE_EXECUTION_ERROR"})
    
    # 2. Feedback stats
    feedback_count = mongo_db.feedbacks.count_documents(time_query)
    bug_reports = mongo_db.feedbacks.count_documents({**time_query, "type": "BUG"})
    feature_requests = mongo_db.feedbacks.count_documents({**time_query, "type": "FEATURE"})
    general_feedback = mongo_db.feedbacks.count_documents({**time_query, "type": "GENERAL"})
    
    # Average rating & rating distribution
    rating_pipeline = [
        {"$match": time_query},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
    ]
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    total_stars = 0
    for r in mongo_db.feedbacks.aggregate(rating_pipeline):
        val = r.get("_id")
        cnt = r.get("count", 0)
        if isinstance(val, int) and val in rating_dist:
            rating_dist[val] = cnt
            total_stars += val * cnt
            
    avg_rating = round(total_stars / feedback_count, 1) if feedback_count > 0 else 0.0

    # 3. Features usage
    feature_pipeline = [
        {"$match": {**time_query, "feature": {"$ne": None, "$nin": ["", None]}}},
        {"$group": {"_id": "$feature", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
        {"$limit": 10},
    ]
    feature_rows = list(mongo_db.analytics_events.aggregate(feature_pipeline))
    total_feature_events = sum(r["cnt"] for r in feature_rows) or 1
    features_usage = [
        {
            "feature": r["_id"],
            "count": r["cnt"],
            "percentage": round((r["cnt"] / total_feature_events) * 100, 1),
        }
        for r in feature_rows
    ]

    # 4. Language usage
    lang_pipeline = [
        {"$match": {**time_query, "metadata.language": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$metadata.language", "cnt": {"$sum": 1}}},
        {"$sort": {"cnt": -1}},
    ]
    lang_rows = list(mongo_db.analytics_events.aggregate(lang_pipeline))
    total_lang_events = sum(r["cnt"] for r in lang_rows) or 0
    languages_usage = []
    if total_lang_events > 0:
        languages_usage = [
            {
                "language": r["_id"] or "Unknown",
                "count": r["cnt"],
                "percentage": round((r["cnt"] / total_lang_events) * 100, 1),
            }
            for r in lang_rows
        ]

    # 5. Activity timeline
    timeline_pipeline = [
        {"$match": time_query},
        {
            "$project": {
                "day": {"$substrCP": ["$created_at", 0, 10]},
                "session_id": "$session_id",
                "is_run": {"$cond": [{"$eq": ["$event_type", "CODE_RUN"]}, 1, 0]},
                "is_trace": {"$cond": [{"$eq": ["$event_type", "TRACE_STARTED"]}, 1, 0]},
            }
        },
        {
            "$group": {
                "_id": "$day",
                "sessions": {"$addToSet": "$session_id"},
                "runs": {"$sum": "$is_run"},
                "traces": {"$sum": "$is_trace"},
            }
        },
        {"$sort": {"_id": 1}},
        {"$limit": 30},
    ]
    timeline_rows = list(mongo_db.analytics_events.aggregate(timeline_pipeline))
    activity_timeline = [
        {
            "date": r["_id"],
            "visitors": len(r.get("sessions", [])),
            "runs": r.get("runs", 0),
            "traces": r.get("traces", 0),
        }
        for r in timeline_rows
    ]

    # 6. Recent events
    recent_docs = list(
        mongo_db.analytics_events.find({})
        .sort("created_at", -1)
        .limit(10)
    )
    recent_events = [
        {
            "eventType": doc.get("event_type", "PAGE_VIEW"),
            "sessionId": (doc.get("session_id") or "anonymous")[:12] + "...",
            "feature": doc.get("feature") or "General",
            "createdAt": doc.get("created_at", ""),
        }
        for doc in recent_docs
    ]

    return {
        "dateRange": date_range,
        "kpis": {
            "totalVisitors": total_visitors,
            "pageViews": page_views,
            "codeRuns": code_runs,
            "traceSessions": trace_sessions,
            "executionsSuccess": executions_success,
            "executionsError": executions_error,
            "feedbackCount": feedback_count,
            "averageRating": avg_rating,
            "bugReports": bug_reports,
            "featureRequests": feature_requests,
            "generalFeedback": general_feedback,
        },
        "ratingDistribution": rating_dist,
        "featuresUsage": features_usage,
        "languagesUsage": languages_usage,
        "activityTimeline": activity_timeline,
        "recentEvents": recent_events,
    }

def get_analytics_summary(date_range: str = "all") -> Dict[str, Any]:
    # Query MongoDB Atlas if active
    if is_mongo_active():
        try:
            mongo_db = get_mongo_db()
            if mongo_db is not None:
                return _get_analytics_summary_mongo(mongo_db, date_range)
        except Exception:
            pass  # Fall back to SQLite on any error

    # Fallback to SQLite
    time_filter = _get_time_filter(date_range)
    
    event_where = "WHERE created_at >= ?" if time_filter else ""
    event_params = [time_filter] if time_filter else []
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Total unique visitors (distinct anonymous sessions)
        cursor.execute(f"SELECT COUNT(DISTINCT session_id) FROM analytics_events {event_where}", event_params)
        total_visitors = cursor.fetchone()[0] or 0
        
        # 2. Total page views
        cursor.execute(
            f"SELECT COUNT(*) FROM analytics_events WHERE event_type = 'PAGE_VIEW' "
            + (f"AND created_at >= ?" if time_filter else ""),
            event_params,
        )
        page_views = cursor.fetchone()[0] or 0
        
        # 3. Total code runs
        cursor.execute(
            f"SELECT COUNT(*) FROM analytics_events WHERE event_type = 'CODE_RUN' "
            + (f"AND created_at >= ?" if time_filter else ""),
            event_params,
        )
        code_runs = cursor.fetchone()[0] or 0
        
        # 4. Total trace sessions
        cursor.execute(
            f"SELECT COUNT(*) FROM analytics_events WHERE event_type = 'TRACE_STARTED' "
            + (f"AND created_at >= ?" if time_filter else ""),
            event_params,
        )
        trace_sessions = cursor.fetchone()[0] or 0
        
        # 5. Execution success count
        cursor.execute(
            f"SELECT COUNT(*) FROM analytics_events WHERE event_type = 'CODE_EXECUTION_SUCCESS' "
            + (f"AND created_at >= ?" if time_filter else ""),
            event_params,
        )
        executions_success = cursor.fetchone()[0] or 0
        
        # 6. Execution error count
        cursor.execute(
            f"SELECT COUNT(*) FROM analytics_events WHERE event_type = 'CODE_EXECUTION_ERROR' "
            + (f"AND created_at >= ?" if time_filter else ""),
            event_params,
        )
        executions_error = cursor.fetchone()[0] or 0
        
        # 7. Feedback metrics from feedbacks table
        fb_where = "WHERE created_at >= ?" if time_filter else ""
        fb_params = [time_filter] if time_filter else []
        
        cursor.execute(f"SELECT COUNT(*), AVG(rating) FROM feedbacks {fb_where}", fb_params)
        fb_row = cursor.fetchone()
        feedback_count = fb_row[0] or 0
        avg_rating = round(fb_row[1], 1) if fb_row[1] is not None else 0.0
        
        cursor.execute(
            f"SELECT COUNT(*) FROM feedbacks WHERE type = 'BUG' "
            + (f"AND created_at >= ?" if time_filter else ""),
            fb_params,
        )
        bug_reports = cursor.fetchone()[0] or 0
        
        cursor.execute(
            f"SELECT COUNT(*) FROM feedbacks WHERE type = 'FEATURE' "
            + (f"AND created_at >= ?" if time_filter else ""),
            fb_params,
        )
        feature_requests = cursor.fetchone()[0] or 0
        
        cursor.execute(
            f"SELECT COUNT(*) FROM feedbacks WHERE type = 'GENERAL' "
            + (f"AND created_at >= ?" if time_filter else ""),
            fb_params,
        )
        general_feedback = cursor.fetchone()[0] or 0
        
        # Rating distribution (1 to 5)
        cursor.execute(
            f"SELECT rating, COUNT(*) FROM feedbacks {fb_where} GROUP BY rating",
            fb_params,
        )
        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r_row in cursor.fetchall():
            if r_row[0] in rating_dist:
                rating_dist[r_row[0]] = r_row[1]
                
        # 8. Feature usage breakdown
        cursor.execute(
            f"""
            SELECT feature, COUNT(*) as cnt
            FROM analytics_events
            WHERE feature IS NOT NULL AND feature != ''
            {f"AND created_at >= ?" if time_filter else ""}
            GROUP BY feature
            ORDER BY cnt DESC
            LIMIT 10
            """,
            event_params,
        )
        feature_rows = cursor.fetchall()
        total_feature_events = sum(row[1] for row in feature_rows) or 1
        features_usage = [
            {
                "feature": row[0],
                "count": row[1],
                "percentage": round((row[1] / total_feature_events) * 100, 1),
            }
            for row in feature_rows
        ]
        
        # 9. Language usage breakdown
        cursor.execute(
            f"""
            SELECT json_extract(metadata, '$.language') as lang, COUNT(*) as cnt
            FROM analytics_events
            WHERE metadata IS NOT NULL AND json_extract(metadata, '$.language') IS NOT NULL
            {f"AND created_at >= ?" if time_filter else ""}
            GROUP BY lang
            ORDER BY cnt DESC
            """,
            event_params,
        )
        lang_rows = cursor.fetchall()
        total_lang_events = sum(row[1] for row in lang_rows) or 0
        
        languages_usage = []
        if total_lang_events > 0:
            languages_usage = [
                {
                    "language": row[0] or "Unknown",
                    "count": row[1],
                    "percentage": round((row[1] / total_lang_events) * 100, 1),
                }
                for row in lang_rows
            ]

        # 10. Activity timeline (grouped by day for chart)
        cursor.execute(
            f"""
            SELECT substr(created_at, 1, 10) as day,
                   COUNT(DISTINCT session_id) as visitors,
                   SUM(CASE WHEN event_type = 'CODE_RUN' THEN 1 ELSE 0 END) as runs,
                   SUM(CASE WHEN event_type = 'TRACE_STARTED' THEN 1 ELSE 0 END) as traces
            FROM analytics_events
            {event_where}
            GROUP BY day
            ORDER BY day ASC
            LIMIT 30
            """,
            event_params,
        )
        timeline_rows = cursor.fetchall()
        activity_timeline = [
            {
                "date": row[0],
                "visitors": row[1] or 0,
                "runs": row[2] or 0,
                "traces": row[3] or 0,
            }
            for row in timeline_rows
        ]
        
        # 11. Recent activity list (last 10 events)
        cursor.execute(
            """
            SELECT event_type, session_id, feature, created_at
            FROM analytics_events
            ORDER BY id DESC
            LIMIT 10
            """
        )
        recent_rows = cursor.fetchall()
        recent_events = [
            {
                "eventType": row[0],
                "sessionId": row[1][:12] + "..." if len(row[1]) > 12 else row[1],
                "feature": row[2] or "General",
                "createdAt": row[3],
            }
            for row in recent_rows
        ]

    return {
        "dateRange": date_range,
        "kpis": {
            "totalVisitors": total_visitors,
            "pageViews": page_views,
            "codeRuns": code_runs,
            "traceSessions": trace_sessions,
            "executionsSuccess": executions_success,
            "executionsError": executions_error,
            "feedbackCount": feedback_count,
            "averageRating": avg_rating,
            "bugReports": bug_reports,
            "featureRequests": feature_requests,
            "generalFeedback": general_feedback,
        },
        "ratingDistribution": rating_dist,
        "featuresUsage": features_usage,
        "languagesUsage": languages_usage,
        "activityTimeline": activity_timeline,
        "recentEvents": recent_events,
    }
