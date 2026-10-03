"""Screenshot upload route with base64 payload handling to avoid external multipart dependencies."""
import os
import re
import uuid
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.app.config import settings

import tempfile

router = APIRouter(prefix="/api/upload", tags=["upload"])

def get_upload_dir() -> str:
    if settings.upload_dir:
        upload_dir = settings.upload_dir
    elif os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        upload_dir = os.path.join(tempfile.gettempdir(), "codelearner_uploads")
    else:
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        upload_dir = os.path.join(backend_dir, "data", "uploads")
    
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except OSError:
        upload_dir = os.path.join(tempfile.gettempdir(), "codelearner_uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
    return upload_dir

class ScreenshotUploadRequest(BaseModel):
    image: str = Field(..., description="Base64 data URL or raw base64 string")
    filename: Optional[str] = Field(default="screenshot.png", max_length=100)

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB

def _detect_and_validate_image_format(data: bytes) -> str:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    elif data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    elif data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    else:
        raise ValueError("Unsupported or invalid image format. Only PNG, JPG, GIF, and WEBP are accepted.")

@router.post("/screenshot")
def upload_screenshot(req: ScreenshotUploadRequest):
    data_str = req.image.strip()
    if not data_str:
        raise HTTPException(status_code=400, detail="Image data is required.")
        
    # Strip data URL prefix if present (e.g., 'data:image/png;base64,....')
    if "," in data_str:
        header, b64_content = data_str.split(",", 1)
    else:
        b64_content = data_str

    try:
        binary_data = base64.b64decode(b64_content)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    if len(binary_data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds maximum size of 5MB.")

    try:
        ext = _detect_and_validate_image_format(binary_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(binary_data)

    return {
        "success": True,
        "url": f"/uploads/{filename}",
        "filename": filename,
    }
