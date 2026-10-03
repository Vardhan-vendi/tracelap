from __future__ import annotations
from typing import Dict, Any, Optional
import json
import httpx
from backend.app.ai.base import BaseAIProvider, CaptionEvaluation
from backend.app.ai.rule_based import RuleBasedExplainer

class OllamaProvider(BaseAIProvider):
    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3.2:1b"):
        self.host = host.rstrip("/")
        self.model = model
        self.fallback = RuleBasedExplainer()

    def generate_caption(self, ctx: Dict[str, Any], level: str = "beginner") -> str:
        prompt = (
            f"You are a coding teacher explaining code execution step-by-step for a {level} student.\n"
            f"Line Number: {ctx.get('line_number')}\n"
            f"Line Code: {ctx.get('line_code')}\n"
            f"Event Type: {ctx.get('event_type')}\n"
            f"Call Stack Function: {ctx.get('frames', [{}])[-1].get('function_name') if ctx.get('frames') else 'Global'}\n"
            f"Variables: {json.dumps(ctx.get('frames', [{}])[-1].get('local_vars', {}) if ctx.get('frames') else {})}\n"
            "Provide exactly ONE short sentence strictly explaining what this line did. Do NOT mention future lines or output markdown."
        )
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.post(
                    f"{self.host}/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False}
                )
                if res.status_code == 200:
                    text = res.json().get("response", "").strip()
                    if text:
                        return text
        except Exception:
            pass
        return self.fallback.generate_caption(ctx, level)

    def evaluate_caption(self, caption: str, ctx: Dict[str, Any], level: str = "beginner") -> CaptionEvaluation:
        return self.fallback.evaluate_caption(caption, ctx, level)

class GroqProvider(BaseAIProvider):
    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        self.api_key = api_key
        self.model = model
        self.fallback = RuleBasedExplainer()

    def generate_caption(self, ctx: Dict[str, Any], level: str = "beginner") -> str:
        if not self.api_key:
            return self.fallback.generate_caption(ctx, level)
        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            messages = [
                {"role": "system", "content": f"You are an expert Python tutor explaining execution step by step for a {level} student. Respond in 1 brief, clear sentence strictly grounded in the provided variables."},
                {"role": "user", "content": f"Line {ctx.get('line_number')}: `{ctx.get('line_code')}`. Variables: {json.dumps(ctx.get('frames', [{}])[-1].get('local_vars', {}) if ctx.get('frames') else {})}"}
            ]
            with httpx.Client(timeout=4.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json={"model": self.model, "messages": messages, "max_tokens": 80}
                )
                if res.status_code == 200:
                    choice = res.json().get("choices", [{}])[0]
                    content = choice.get("message", {}).get("content", "").strip()
                    if content:
                        return content
        except Exception:
            pass
        return self.fallback.generate_caption(ctx, level)

    def evaluate_caption(self, caption: str, ctx: Dict[str, Any], level: str = "beginner") -> CaptionEvaluation:
        return self.fallback.evaluate_caption(caption, ctx, level)

def get_ai_provider(provider_type: str = "rule_based", **kwargs) -> BaseAIProvider:
    provider_type = (provider_type or "rule_based").lower()
    if provider_type == "ollama":
        return OllamaProvider(
            host=kwargs.get("host", "http://localhost:11434"),
            model=kwargs.get("model", "llama3.2:1b")
        )
    elif provider_type == "groq":
        return GroqProvider(
            api_key=kwargs.get("api_key", ""),
            model=kwargs.get("model", "llama-3.1-8b-instant")
        )
    return RuleBasedExplainer()
