"""Feedback API routes."""
import time
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from backend.app.db.feedback import create_feedback, get_public_feedbacks
from backend.app.db.analytics import record_event

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# Simple in-memory rate limiting to prevent spam
_RATE_LIMIT_BUCKET: Dict[str, List[float]] = {}
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SEC = 300  # 5 minutes

def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    timestamps = _RATE_LIMIT_BUCKET.get(client_ip, [])
    # Filter timestamps within window
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SEC]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many feedback submissions. Please wait a few minutes before submitting again.",
        )
    timestamps.append(now)
    _RATE_LIMIT_BUCKET[client_ip] = timestamps

class FeedbackCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    message: str = Field(..., min_length=1, max_length=3000, description="Feedback message")
    type: str = Field(default="GENERAL", description="Feedback type: 'GENERAL', 'BUG', or 'FEATURE'")
    name: Optional[str] = Field(default=None, max_length=100, description="Optional submitter name")
    role: Optional[str] = Field(default=None, max_length=100, description="Optional submitter role")
    screenshotUrl: Optional[str] = Field(default=None, max_length=500, description="Optional screenshot URL")
    profileUrl: Optional[str] = Field(default=None, max_length=500, description="Optional GitHub / LinkedIn profile URL")
    displayPermission: bool = Field(default=False, description="Explicit consent to display feedback publicly")

@router.post("")
def submit_feedback(req: FeedbackCreateRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    clean_message = req.message.strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty.")

    clean_type = req.type.upper().strip()
    if clean_type not in {"GENERAL", "BUG", "FEATURE"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid feedback type. Must be 'GENERAL', 'BUG', or 'FEATURE'."
        )

    try:
        feedback = create_feedback(
            rating=req.rating,
            message=clean_message,
            feedback_type=clean_type,
            name=req.name,
            role=req.role,
            screenshot_url=req.screenshotUrl,
            profile_url=req.profileUrl,
            display_permission=req.displayPermission,
        )

        # Track corresponding analytics event
        record_event(
            event_type="FEEDBACK_SUBMITTED",
            session_id="system-feedback",
            page="/",
            feature=f"Rating {req.rating}⭐",
            metadata={"feedbackId": feedback["id"], "type": clean_type, "rating": req.rating},
        )
        if clean_type == "BUG":
            record_event(
                event_type="BUG_REPORTED",
                session_id="system-feedback",
                page="/",
                feature="Bug Report",
                metadata={"feedbackId": feedback["id"]},
            )
        elif clean_type == "FEATURE":
            record_event(
                event_type="FEATURE_REQUESTED",
                session_id="system-feedback",
                page="/",
                feature="Feature Request",
                metadata={"feedbackId": feedback["id"]},
            )

        return {
            "success": True,
            "message": "Feedback submitted successfully",
            "id": feedback["id"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save feedback. Please try again.")

@router.get("/public")
def list_public_feedback(limit: int = 20):
    """Retrieve verified testimonials / public feedback where user explicitly granted displayPermission."""
    clamped_limit = max(1, min(limit, 50))
    feedbacks = get_public_feedbacks(limit=clamped_limit)
    return {
        "success": True,
        "items": feedbacks,
        "total": len(feedbacks),
    }
