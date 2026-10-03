from __future__ import annotations
from typing import List, Dict, Any, Optional
from backend.app.ai.base import BaseAIProvider
from backend.app.ai.providers import get_ai_provider
from backend.app.ai.evaluator import evaluator
from backend.app.ai.cache import caption_cache
from tracer.schema import TraceStep, TraceResult

class TraceExplainer:
    def __init__(self, provider: Optional[BaseAIProvider] = None):
        self.provider = provider or get_ai_provider("rule_based")

    def enrich_trace_steps(
        self,
        code_lines: List[str],
        steps: List[TraceStep],
        level: str = "beginner"
    ) -> List[TraceStep]:
        for step in steps:
            line_idx = step.line_number - 1
            line_code = code_lines[line_idx] if 0 <= line_idx < len(code_lines) else ""
            frames_dicts = [f.model_dump() for f in step.frames]
            active_vars = frames_dicts[-1].get("local_vars", {}) if frames_dicts else {}

            # Check cache
            cached_caption = caption_cache.get(line_code, step.line_number, step.event_type, level, active_vars)
            if cached_caption:
                step.caption = cached_caption
                continue

            ctx: Dict[str, Any] = {
                "line_number": step.line_number,
                "line_code": line_code,
                "event_type": step.event_type,
                "frames": frames_dicts,
                "external_call": step.external_call.model_dump() if step.external_call else None,
                "stdout": step.stdout,
                "stderr": step.stderr,
                "memory": step.memory.model_dump()
            }

            caption = self.provider.generate_caption(ctx, level)
            eval_res = evaluator.evaluate(caption, ctx, level)

            # If evaluation failed and not already using rule-based fallback, fall back to rule-based explainer
            if not eval_res.is_valid and not isinstance(self.provider, get_ai_provider("rule_based").__class__):
                from backend.app.ai.rule_based import RuleBasedExplainer
                caption = RuleBasedExplainer().generate_caption(ctx, level)

            step.caption = caption
            caption_cache.set(line_code, step.line_number, step.event_type, level, active_vars, caption)

        return steps
