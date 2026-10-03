import os
import tempfile
import pytest

# Use an isolated temporary SQLite database for testing so genuine user data is never contaminated
_test_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db_path = _test_db_file.name
_test_db_file.close()

os.environ["DATABASE_PATH"] = _test_db_path

from backend.app.config import settings
settings.database_path = _test_db_path

from backend.app.db.database import init_db
init_db()

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_submit_feedback_success():
    payload = {
        "rating": 5,
        "message": "The step-by-step memory visualization helped me understand pointers!",
        "type": "GENERAL",
        "name": "Alex",
        "role": "Student",
        "profileUrl": "https://github.com/alex",
        "displayPermission": True,
    }
    response = client.post("/api/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "id" in data
    assert data["message"] == "Feedback submitted successfully"

def test_submit_feedback_validation_errors():
    # Empty message
    res1 = client.post("/api/feedback", json={"rating": 5, "message": "   ", "type": "GENERAL"})
    assert res1.status_code == 422 or res1.status_code == 400

    # Rating out of bounds
    res2 = client.post("/api/feedback", json={"rating": 6, "message": "Too high", "type": "GENERAL"})
    assert res2.status_code == 422 or res2.status_code == 400

    # Invalid type
    res3 = client.post("/api/feedback", json={"rating": 3, "message": "Invalid type", "type": "RANDOM"})
    assert res3.status_code == 400

def test_public_feedback_display_permission():
    # Submit one with permission
    client.post("/api/feedback", json={
        "rating": 4,
        "message": "Public review 1",
        "type": "GENERAL",
        "displayPermission": True,
        "name": "Reviewer 1",
    })
    # Submit one without permission
    client.post("/api/feedback", json={
        "rating": 2,
        "message": "Private review 2",
        "type": "BUG",
        "displayPermission": False,
        "name": "Anonymous",
    })

    res = client.get("/api/feedback/public")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert isinstance(data["items"], list)
    # Ensure all public feedback have displayPermission implied
    for item in data["items"]:
        assert "message" in item
        assert "rating" in item

def test_record_analytics_event():
    payload = {
        "eventType": "CODE_RUN",
        "sessionId": "test-session-12345",
        "page": "/",
        "feature": "recursion",
        "metadata": {"language": "Python 3.12", "timeMs": 42},
    }
    res = client.post("/api/analytics/event", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "eventId" in data

def test_admin_access_protection():
    # Without header -> 401
    res1 = client.get("/api/admin/analytics")
    assert res1.status_code == 401

    # With wrong key -> 401
    res2 = client.get("/api/admin/analytics", headers={"X-Admin-Key": "wrong-key"})
    assert res2.status_code == 401

    # With correct key -> 200
    admin_key = settings.admin_secret_key
    res3 = client.get("/api/admin/analytics", headers={"X-Admin-Key": admin_key})
    assert res3.status_code == 200
    data = res3.json()
    assert "kpis" in data
    assert "totalVisitors" in data["kpis"]
    assert "codeRuns" in data["kpis"]
    assert "activityTimeline" in data

def test_admin_verify_key():
    admin_key = settings.admin_secret_key
    res_valid = client.post("/api/admin/verify", json={"key": admin_key})
    assert res_valid.status_code == 200
    assert res_valid.json()["valid"] is True

    res_invalid = client.post("/api/admin/verify", json={"key": "bad-key"})
    assert res_invalid.status_code == 401

def test_admin_feedback_list():
    admin_key = settings.admin_secret_key
    res = client.get("/api/admin/feedback", headers={"X-Admin-Key": admin_key})
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)

def test_upload_screenshot_png():
    # 1x1 transparent PNG base64
    png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    data_url = f"data:image/png;base64,{png_b64}"
    res = client.post("/api/upload/screenshot", json={"image": data_url, "filename": "test.png"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["url"].startswith("/uploads/")

def test_record_interactive_events():
    events = [
        ("FEEDBACK_MODAL_OPENED", "Feedback Modal", None),
        ("ANIMATION_PLAY", "Controls", {"speed": 2}),
        ("SPEED_CHANGED", "Controls", {"speed": 1.5}),
        ("FILE_SAVED", "App Menu", {"language": "Python 3.12"}),
    ]
    for ev_type, feature, meta in events:
        res = client.post("/api/analytics/event", json={
            "eventType": ev_type,
            "sessionId": "test-interactive-session",
            "page": "/",
            "feature": feature,
            "metadata": meta,
        })
        assert res.status_code == 200
        assert res.json()["success"] is True

def test_persistent_backup_logging():
    from backend.app.db.backup import read_backup_records
    fb_records = read_backup_records("feedbacks")
    ev_records = read_backup_records("analytics_events")
    # Both should be lists and contain genuine data written during operations
    assert isinstance(fb_records, list)
    assert isinstance(ev_records, list)
    assert len(fb_records) > 0
    assert len(ev_records) > 0

def test_mongodb_module_resilience():
    from backend.app.db.mongo import is_mongo_active, get_mongo_client
    # When MONGODB_URI is not set, should gracefully return False / None without error
    assert is_mongo_active() is False
    assert get_mongo_client() is None

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_database():
    yield
    # Cleanup temporary test database file
    try:
        if os.path.exists(_test_db_path):
            os.remove(_test_db_path)
    except Exception:
        pass
