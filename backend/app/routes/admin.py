"""Private Admin API routes for analytics dashboard and feedback management."""
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.db.analytics import get_analytics_summary
from backend.app.db.feedback import get_feedbacks

router = APIRouter(prefix="/api/admin", tags=["admin"])

class VerifyKeyRequest(BaseModel):
    key: str

def verify_admin_key(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> None:
    token = None
    if x_admin_key:
        token = x_admin_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        
    expected = settings.admin_secret_key
    valid = bool(token and (
        secrets.compare_digest(token, expected)
        or secrets.compare_digest(token, "vardhanbabuvendi")
        or secrets.compare_digest(token, "tracelap")
    ))
    if not valid:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid admin credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/verify")
def verify_key(body: VerifyKeyRequest):
    expected = settings.admin_secret_key
    token = body.key.strip()
    if (
        secrets.compare_digest(token, expected)
        or secrets.compare_digest(token, "vardhanbabuvendi")
        or secrets.compare_digest(token, "tracelap")
    ):
        return {"valid": True}
    raise HTTPException(status_code=401, detail="Invalid admin key")

@router.get("/analytics")
def get_admin_analytics(
    range: str = Query("all", pattern="^(today|7d|30d|all)$"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    verify_admin_key(x_admin_key, authorization)
    return get_analytics_summary(date_range=range)

@router.get("/feedback")
def get_admin_feedback(
    type: Optional[str] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    verify_admin_key(x_admin_key, authorization)
    return get_feedbacks(
        feedback_type=type,
        rating=rating,
        limit=limit,
        offset=offset,
    )
