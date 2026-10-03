"""Analytics event ingestion API."""
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.app.db.analytics import record_event

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class AnalyticsEventRequest(BaseModel):
    eventType: str = Field(..., min_length=2, max_length=50, description="Name of the analytics event")
    sessionId: str = Field(..., min_length=3, max_length=100, description="Anonymous session identifier")
    page: Optional[str] = Field(default="/", max_length=200, description="Current page path")
    feature: Optional[str] = Field(default=None, max_length=100, description="Learning feature name")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Safe metadata dictionary")

@router.post("/event")
def capture_event(req: AnalyticsEventRequest):
    if not req.eventType.strip():
        raise HTTPException(status_code=400, detail="eventType cannot be empty.")
    if not req.sessionId.strip():
        raise HTTPException(status_code=400, detail="sessionId cannot be empty.")

    try:
        event_id = record_event(
            event_type=req.eventType,
            session_id=req.sessionId,
            page=req.page or "/",
            feature=req.feature,
            metadata=req.metadata,
        )
        return {"success": True, "eventId": event_id}
    except Exception as e:
        # Graceful return to avoid breaking clients
        return {"success": False, "error": str(e)}
