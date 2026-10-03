import sys
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TRACER_DIR = os.path.join(BASE_DIR, "tracer")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if TRACER_DIR not in sys.path:
    sys.path.insert(0, TRACER_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.db.database import init_db
from backend.app.routes.run import router as run_router
from backend.app.routes.explain import router as explain_router
from backend.app.routes.examples import router as examples_router
from backend.app.routes.feedback import router as feedback_router
from backend.app.routes.analytics import router as analytics_router
from backend.app.routes.admin import router as admin_router
from backend.app.routes.upload import router as upload_router, get_upload_dir

# Initialize database schema and tables safely
try:
    init_db()
except Exception as e:
    import logging
    logging.getLogger("uvicorn.error").warning("init_db deferred or failed: %s", e)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Code Flow Visualizer Backend API with Python Execution Tracer, Analytics & Feedback"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(run_router)
app.include_router(explain_router)
app.include_router(examples_router)
app.include_router(feedback_router)
app.include_router(analytics_router)
app.include_router(admin_router)
app.include_router(upload_router)

# Mount uploads static directory safely
try:
    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
except Exception as e:
    import logging
    logging.getLogger("uvicorn.error").warning("Failed to mount /uploads: %s", e)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "ai_provider": settings.ai_provider
    }

# Mount static frontend build if it exists (promoted to CDN on Vercel)
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def index():
        return {
            "status": "healthy",
            "message": "TRACELAP API backend is running! Frontend build not found in frontend/dist.",
            "endpoints": {
                "health": "/api/health",
                "run": "/api/run",
                "explain": "/api/explain",
                "examples": "/api/examples",
                "feedback": "/api/feedback",
                "analytics": "/api/analytics/event",
                "admin": "/api/admin/analytics",
            }
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
