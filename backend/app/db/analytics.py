"""Database operations for product analytics."""
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from backend.app.db.database import get_connection

VALID_EVENT_TYPES = {
    "PAGE_VIEW",
    "CODE_RUN",
    "TRACE_STARTED",
    "TRACE_COMPLETED",
    "CODE_EXECUTION_SUCCESS",
    "CODE_EXECUTION_ERROR",
    "FEEDBACK_SUBMITTED",
    "BUG_REPORTED",
    "FEATURE_REQUESTED",
    "LANGUAGE_SELECTED",
    "VISUALIZER_OPENED",
}

def record_event(
    event_type: str,
    session_id: str,
    page: str = "/",
    feature: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    clean_type = event_type.upper().strip()
    if clean_type not in VALID_EVENT_TYPES and not clean_type.startswith("CUSTOM_"):
        clean_type = "PAGE_VIEW"
        
    clean_session_id = (session_id or "anonymous").strip()[:100]
    clean_page = (page or "/")[:200]
    clean_feature = (feature.strip()[:100]) if feature else None
    
    # Sanitize metadata: remove potentially large or sensitive values
    safe_metadata = {}
    if isinstance(metadata, dict):
        for k, v in metadata.items():
            if k in ("code", "password", "token", "key"):
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
        return cursor.lastrowid

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

def get_analytics_summary(date_range: str = "all") -> Dict[str, Any]:
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
        # Try extracting language from metadata JSON or default to recorded events
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
        else:
            # Fallback if no specific language metadata was captured yet
            languages_usage = []

        # 10. Activity timeline (grouped by day for chart)
        # We query the last 7 days or date range days
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
