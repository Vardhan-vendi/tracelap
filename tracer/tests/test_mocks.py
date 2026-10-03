import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tracer.engine import ExecutionTracer

def test_mock_db_trace_event():
    code = """
users = db.query("SELECT * FROM users")
new_user = db.insert("users", {"name": "Dave", "role": "student", "score": 90})
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    # Verify external call events were captured in steps
    ext_events = [step.external_call for step in res.steps if step.external_call is not None]
    assert len(ext_events) >= 2
    assert ext_events[0].kind == "db"
    assert ext_events[0].action == "SELECT"
    assert ext_events[1].action == "INSERT"

def test_mock_api_trace_event():
    code = """
weather = api.get("https://api.weather.com/v1/forecast")
post_res = api.post("https://api.weather.com/v1/report", json={"alert": "rain"})
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    ext_events = [step.external_call for step in res.steps if step.external_call is not None]
    assert len(ext_events) >= 2
    assert ext_events[0].kind == "api"
    assert ext_events[0].action == "GET"
    assert ext_events[1].action == "POST"
