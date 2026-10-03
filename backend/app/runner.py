from __future__ import annotations
import sys
import os
import uuid
from typing import Dict, Optional

# Add tracer to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TRACER_DIR = os.path.join(BASE_DIR, "tracer")
if TRACER_DIR not in sys.path:
    sys.path.insert(0, TRACER_DIR)

from tracer.engine import ExecutionTracer
from tracer.schema import TraceResult
from backend.app.ai.explainer import TraceExplainer
from backend.app.ai.providers import get_ai_provider
from backend.app.config import settings

# In-memory store for async jobs / traces
job_store: Dict[str, TraceResult] = {}

class CodeRunner:
    @staticmethod
    def execute(code: str, level: str = "beginner", provider_name: Optional[str] = None, api_key: Optional[str] = None) -> TraceResult:
        tracer = ExecutionTracer(max_steps=settings.max_steps, timeout_sec=settings.timeout_sec)
        trace_res = tracer.run(code)

        # Enrich steps with plain-language explanations
        chosen_provider = provider_name or settings.ai_provider
        provider = get_ai_provider(chosen_provider, api_key=api_key or settings.groq_api_key, host=settings.ollama_host)
        explainer = TraceExplainer(provider)

        code_lines = code.split("\n")
        trace_res.steps = explainer.enrich_trace_steps(code_lines, trace_res.steps, level=level)

        return trace_res

    @staticmethod
    def run_async(code: str, level: str = "beginner", provider_name: Optional[str] = None, api_key: Optional[str] = None) -> str:
        job_id = str(uuid.uuid4())
        # Run execution and cache result
        res = CodeRunner.execute(code, level, provider_name, api_key)
        job_store[job_id] = res
        return job_id

    @staticmethod
    def get_job(job_id: str) -> Optional[TraceResult]:
        return job_store.get(job_id)
