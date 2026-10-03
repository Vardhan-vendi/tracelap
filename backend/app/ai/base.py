from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class CaptionEvaluation(BaseModel):
    is_valid: bool
    score: float = 1.0
    feedback: Optional[str] = None
    passed_rubric: Dict[str, bool] = {}

class BaseAIProvider(ABC):
    @abstractmethod
    def generate_caption(self, step_context: Dict[str, Any], level: str = "beginner") -> str:
        """Generate a plain-language caption explaining what the current step did."""
        pass

    @abstractmethod
    def evaluate_caption(self, caption: str, step_context: Dict[str, Any], level: str = "beginner") -> CaptionEvaluation:
        """Evaluate a generated caption against the grounding and pedagogical rubric."""
        pass
