from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from backend.app.ai.providers import get_ai_provider
from backend.app.ai.evaluator import evaluator
from backend.app.ai.base import CaptionEvaluation

router = APIRouter(prefix="/api/explain", tags=["ai"])

class ExplainStepRequest(BaseModel):
    step_context: Dict[str, Any]
    level: str = "beginner"
    provider: str = "rule_based"
    api_key: Optional[str] = None

class ExplainStepResponse(BaseModel):
    caption: str
    evaluation: CaptionEvaluation

@router.post("", response_model=ExplainStepResponse)
def explain_step(req: ExplainStepRequest):
    provider = get_ai_provider(req.provider, api_key=req.api_key)
    caption = provider.generate_caption(req.step_context, req.level)
    eval_res = evaluator.evaluate(caption, req.step_context, req.level)
    return ExplainStepResponse(caption=caption, evaluation=eval_res)
