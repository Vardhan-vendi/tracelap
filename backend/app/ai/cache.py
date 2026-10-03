from __future__ import annotations
from typing import Dict, Optional
import hashlib
import json

class CaptionCache:
    def __init__(self, max_size: int = 500):
        self.max_size = max_size
        self._cache: Dict[str, str] = {}

    def _make_key(self, line_code: str, line_no: int, event_type: str, level: str, local_vars_repr: str) -> str:
        raw = f"{line_code}|{line_no}|{event_type}|{level}|{local_vars_repr}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, line_code: str, line_no: int, event_type: str, level: str, local_vars: dict) -> Optional[str]:
        v_repr = json.dumps(sorted(list(local_vars.keys())))
        key = self._make_key(line_code, line_no, event_type, level, v_repr)
        return self._cache.get(key)

    def set(self, line_code: str, line_no: int, event_type: str, level: str, local_vars: dict, caption: str):
        if len(self._cache) >= self.max_size:
            # Drop oldest key
            first_k = next(iter(self._cache))
            del self._cache[first_k]
        v_repr = json.dumps(sorted(list(local_vars.keys())))
        key = self._make_key(line_code, line_no, event_type, level, v_repr)
        self._cache[key] = caption

caption_cache = CaptionCache()
