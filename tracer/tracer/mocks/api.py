from __future__ import annotations
from typing import Callable, Optional, Dict, Any
import time
from tracer.schema import ExternalCallEvent

_api_event_callback: Optional[Callable[[ExternalCallEvent], None]] = None

def set_api_callback(cb: Optional[Callable[[ExternalCallEvent], None]]):
    global _api_event_callback
    _api_event_callback = cb

class MockAPIResponse:
    def __init__(self, status_code: int, data: Any):
        self.status_code = status_code
        self._data = data

    def json(self) -> Any:
        return self._data

    def __repr__(self) -> str:
        return f"<Response [{self.status_code}]>"

class MockAPI:
    def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> MockAPIResponse:
        start_t = time.time()
        lower_url = url.lower()

        if "weather" in lower_url:
            data = {"city": "New York", "temp_c": 21, "condition": "Partly Cloudy", "humidity": 55}
        elif "user" in lower_url:
            data = {"id": 101, "username": "student_coder", "rank": "Gold", "xp": 1420}
        elif "quote" in lower_url:
            data = {"quote": "Simplicity is prerequisite for reliability.", "author": "Edsger W. Dijkstra"}
        else:
            data = {"status": "ok", "url": url, "received_params": params or {}}

        duration = round((time.time() - start_t) * 1000, 2)
        event = ExternalCallEvent(
            kind="api",
            action="GET",
            target=url,
            payload=params,
            result={"status_code": 200, "data": data},
            duration_ms=duration
        )
        if _api_event_callback:
            _api_event_callback(event)

        return MockAPIResponse(200, data)

    def post(self, url: str, json: Optional[Dict[str, Any]] = None) -> MockAPIResponse:
        start_t = time.time()
        duration = round((time.time() - start_t) * 1000, 2)
        data = {"status": "created", "received": json or {}, "id": 999}
        event = ExternalCallEvent(
            kind="api",
            action="POST",
            target=url,
            payload=json,
            result={"status_code": 201, "data": data},
            duration_ms=duration
        )
        if _api_event_callback:
            _api_event_callback(event)

        return MockAPIResponse(201, data)

api = MockAPI()
