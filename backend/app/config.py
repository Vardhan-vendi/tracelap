import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

def _load_dotenv():
    # Try importing python-dotenv if installed
    try:
        from dotenv import load_dotenv
        load_dotenv()
        return
    except ImportError:
        pass

    # Built-in lightweight fallback parser for .env file
    possible_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for env_path in possible_paths:
        if env_path.is_file():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and key not in os.environ:
                            os.environ[key] = val
                break
            except Exception:
                pass

_load_dotenv()

def _safe_int(val: Optional[str], default: int) -> int:
    if val is not None and str(val).strip():
        try:
            return int(str(val).strip().strip("'\""))
        except (ValueError, TypeError):
            pass
    return default

def _safe_float(val: Optional[str], default: float) -> float:
    if val is not None and str(val).strip():
        try:
            return float(str(val).strip().strip("'\""))
        except (ValueError, TypeError):
            pass
    return default

class Settings(BaseModel):
    app_name: str = "Code Flow Visualizer API"
    version: str = "1.0.0"
    debug: bool = True
    ai_provider: str = os.getenv("AI_PROVIDER", "rule_based") or "rule_based"
    groq_api_key: str = os.getenv("GROQ_API_KEY", "") or ""
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434") or "http://localhost:11434"
    max_steps: int = _safe_int(os.getenv("MAX_STEPS"), 1000)
    timeout_sec: float = _safe_float(os.getenv("TIMEOUT_SEC"), 4.0)
    admin_secret_key: str = os.getenv("ADMIN_SECRET_KEY", "codelearner-admin-2026") or "codelearner-admin-2026"
    database_path: str = os.getenv("DATABASE_PATH", "") or ""
    upload_dir: str = os.getenv("UPLOAD_DIR", "") or ""

settings = Settings()

