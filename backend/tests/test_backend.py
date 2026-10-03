import sys
import os
import pytest
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
TRACER_DIR = os.path.join(BASE_DIR, "tracer")
if TRACER_DIR not in sys.path:
    sys.path.insert(0, TRACER_DIR)

from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_get_examples():
    response = client.get("/api/examples")
    assert response.status_code == 200
    examples = response.json()
    assert isinstance(examples, list)
    assert len(examples) >= 5
    ids = [ex["id"] for ex in examples]
    assert "aliasing" in ids
    assert "recursion" in ids
    assert "mock_db" in ids

def test_run_code_success():
    code = "a = 5\nb = 10\nc = a + b"
    response = client.post("/api/run", json={"code": code, "level": "beginner"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_steps"] > 0
    # Steps should have captions generated
    for step in data["steps"]:
        assert step["caption"] is not None

def test_run_code_empty():
    response = client.post("/api/run", json={"code": "   "})
    assert response.status_code == 400

def test_run_code_with_aliasing():
    code = "x = [1, 2]\ny = x\ny.append(3)"
    response = client.post("/api/run", json={"code": code, "level": "intermediate"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    last_step = data["steps"][-1]
    # Check heap references
    assert len(last_step["heap"]) > 0

def test_explain_endpoint():
    ctx = {
        "line_number": 2,
        "line_code": "x = 42",
        "event_type": "line",
        "frames": [{"function_name": "Global Scope", "local_vars": {"x": {"value_repr": "42", "is_changed": True}}}],
    }
    response = client.post("/api/explain", json={"step_context": ctx, "level": "beginner"})
    assert response.status_code == 200
    data = response.json()
    assert "caption" in data
    assert data["evaluation"]["is_valid"] is True
