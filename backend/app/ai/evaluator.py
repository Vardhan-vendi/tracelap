from __future__ import annotations
from typing import Dict, Any, List, Set
from backend.app.ai.base import CaptionEvaluation

FORBIDDEN_BEGINNER_JARGON = {"opcode", "dereference", "call stack frame pointer", "segmentation", "register"}
SPOILER_PHRASES = {"in the next step", "later on line", "subsequently in line", "will happen later", "before it returns"}

class CaptionEvaluator:
    def evaluate(self, caption: str, ctx: Dict[str, Any], level: str = "beginner") -> CaptionEvaluation:
        cap_clean = caption.strip()
        cap_lower = cap_clean.lower()
        rubric: Dict[str, bool] = {}

        # 1. Non-empty & appropriate length
        rubric["appropriate_length"] = 10 <= len(cap_clean) <= 300

        # 2. No spoiler phrasing
        has_spoilers = any(phrase in cap_lower for phrase in SPOILER_PHRASES)
        rubric["no_spoilers"] = not has_spoilers

        # 3. Jargon check for beginners
        if level.lower() == "beginner":
            has_jargon = any(jargon in cap_lower for jargon in FORBIDDEN_BEGINNER_JARGON)
            rubric["level_appropriate"] = not has_jargon
        else:
            rubric["level_appropriate"] = True

        # 4. Line or context grounding
        line_no = ctx.get("line_number")
        has_line_ref = (str(line_no) in cap_clean) if line_no else True
        is_structural_event = ctx.get("event_type") in ("call", "return", "exception", "external")
        rubric["grounded_in_event"] = has_line_ref or is_structural_event

        passed_all = all(rubric.values())
        score = sum(1.0 for v in rubric.values() if v) / len(rubric)

        feedback = "Passed all rubric checks." if passed_all else f"Failed checks: {[k for k, v in rubric.items() if not v]}"

        return CaptionEvaluation(
            is_valid=passed_all,
            score=round(score, 2),
            feedback=feedback,
            passed_rubric=rubric
        )

evaluator = CaptionEvaluator()
