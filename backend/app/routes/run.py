from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Union
from tracer.schema import TraceResult
from backend.app.runner import CodeRunner

router = APIRouter(prefix="/api", tags=["execution"])

class RunRequest(BaseModel):
    code: str = Field(..., description="Python source code to execute and trace")
    level: str = Field(default="beginner", description="'beginner' or 'intermediate'")
    provider: Optional[str] = Field(default="rule_based", description="AI provider: 'rule_based', 'groq', 'ollama'")
    api_key: Optional[str] = Field(default=None, description="API key for cloud providers like Groq")
    async_mode: bool = Field(default=False, description="Whether to run asynchronously")

class AsyncRunResponse(BaseModel):
    job_id: str
    status: str

@router.post("/run", response_model=Union[TraceResult, AsyncRunResponse])
def run_code(req: RunRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty.")

    if req.async_mode:
        job_id = CodeRunner.run_async(req.code, req.level, req.provider, req.api_key)
        return AsyncRunResponse(job_id=job_id, status="completed")

    return CodeRunner.execute(req.code, req.level, req.provider, req.api_key)

@router.get("/trace/{job_id}", response_model=TraceResult)
def get_trace(job_id: str):
    res = CodeRunner.get_job(job_id)
    if not res:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    return res
