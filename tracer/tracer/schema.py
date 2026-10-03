from __future__ import annotations
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

class VariableSnapshot(BaseModel):
    name: str
    type_name: str
    value_repr: str
    object_id: Optional[str] = None  # str(id(obj)) for reference tracking
    is_changed: bool = False
    is_pointer: bool = False  # True if pointing to a compound/heap object

class FrameSnapshot(BaseModel):
    frame_id: str
    function_name: str
    line_number: int
    depth: int
    local_vars: Dict[str, VariableSnapshot] = Field(default_factory=dict)
    return_value: Optional[str] = None
    call_id: Optional[str] = None
    parent_call_id: Optional[str] = None
    caller_line_number: Optional[int] = None
    caller_code: Optional[str] = None
    is_recursion: bool = False
    is_active: bool = True
    args: Dict[str, str] = Field(default_factory=dict)

class MemorySnapshot(BaseModel):
    current_bytes: int = 0
    peak_bytes: int = 0
    delta_bytes: int = 0

class ExternalCallEvent(BaseModel):
    kind: str  # "db" or "api"
    action: str  # e.g. "QUERY", "INSERT", "GET", "POST"
    target: str  # table name or URL
    payload: Optional[Union[str, Dict[str, Any]]] = None
    result: Optional[Union[str, Dict[str, Any]]] = None
    duration_ms: float = 0.0

class HeapObject(BaseModel):
    object_id: str
    type_name: str
    repr_value: str
    elements: Optional[List[Any]] = None  # For lists/tuples/sets
    key_values: Optional[Dict[str, Any]] = None  # For dicts/objects
    attributes: Optional[Dict[str, Any]] = None  # For custom class instances
    is_tree_node: bool = False

class TraceStep(BaseModel):
    step_index: int
    line_number: int
    event_type: str  # "line", "call", "return", "exception", "external"
    frames: List[FrameSnapshot] = Field(default_factory=list)
    all_frames: List[FrameSnapshot] = Field(default_factory=list)  # Call tree history (active + completed/dull frames)
    heap: Dict[str, HeapObject] = Field(default_factory=dict)
    memory: MemorySnapshot = Field(default_factory=MemorySnapshot)
    stdout: str = ""
    stderr: str = ""
    external_call: Optional[ExternalCallEvent] = None
    caption: Optional[str] = None
    step_code: Optional[str] = None
    caller_line_number: Optional[int] = None
    is_recursion: bool = False

class TraceResult(BaseModel):
    success: bool
    total_steps: int
    steps: List[TraceStep] = Field(default_factory=list)
    error: Optional[str] = None
    execution_time_ms: float = 0.0
