from __future__ import annotations
import sys
import os
import io
import time
import tracemalloc
from types import FrameType
from typing import List, Dict, Optional, Any, Set

from tracer.schema import (
    TraceStep, TraceResult, FrameSnapshot, VariableSnapshot,
    HeapObject, MemorySnapshot, ExternalCallEvent
)
from tracer.serializer import StateSerializer, safe_repr
from tracer.detector import analyze_code
from tracer.mocks.db import set_db_callback
from tracer.mocks.api import set_api_callback

DEFAULT_MAX_STEPS = 1000
DEFAULT_TIMEOUT_SEC = 4.0

class StepLimitExceeded(Exception):
    pass

class ExecutionTimeout(Exception):
    pass

class ExecutionTracer:
    def __init__(self, max_steps: int = DEFAULT_MAX_STEPS, timeout_sec: float = DEFAULT_TIMEOUT_SEC):
        self.max_steps = max_steps
        self.timeout_sec = timeout_sec
        self.serializer = StateSerializer()
        self.steps: List[TraceStep] = []
        self.stdout_buf = io.StringIO()
        self.stderr_buf = io.StringIO()
        self.pending_external_calls: List[ExternalCallEvent] = []
        self.start_time = 0.0
        self.target_code_name = "<student_code>"
        self.prev_var_values: Dict[str, Dict[str, str]] = {}  # frame_id -> {var_name: val_repr}
        self.code_lines: List[str] = []

        # Call tree & execution trajectory tracking
        self.call_counter = 0
        self.frame_to_call_id: Dict[int, str] = {}
        self.all_call_records: Dict[str, Dict[str, Any]] = {}
        self.pending_lines: Dict[int, tuple[int, str]] = {}

    def _on_external_call(self, event: ExternalCallEvent):
        self.pending_external_calls.append(event)

    def _get_call_stack(self, frame: FrameType, heap: Dict[str, HeapObject], visited_ids: Set[int]) -> tuple[List[FrameSnapshot], List[FrameSnapshot]]:
        # 1. Active stack frames
        active_stack: List[FrameType] = []
        curr = frame
        while curr is not None:
            if curr.f_code.co_filename == self.target_code_name:
                active_stack.append(curr)
            curr = curr.f_back
        active_stack.reverse()

        active_frame_ids = set()
        active_frames: List[FrameSnapshot] = []

        for idx, f in enumerate(active_stack):
            f_ptr = id(f)
            call_id = self.frame_to_call_id.get(f_ptr)
            if not call_id:
                self.call_counter += 1
                call_id = f"call_{self.call_counter}_{f.f_code.co_name}"
                self.frame_to_call_id[f_ptr] = call_id

            active_frame_ids.add(call_id)
            func_name = f.f_code.co_name
            if func_name == "<module>":
                func_name = "Global Scope"

            if call_id not in self.prev_var_values:
                self.prev_var_values[call_id] = {}

            local_vars: Dict[str, VariableSnapshot] = {}
            for k, v in f.f_locals.items():
                if k.startswith("__") and k.endswith("__"):
                    continue
                if k in ("db", "api", "MockDatabase", "MockAPI", "input", "safe_input"):
                    continue
                prev_repr = self.prev_var_values[call_id].get(k)
                var_snap = self.serializer.serialize_variable(k, v, heap, visited_ids, prev_repr)
                local_vars[k] = var_snap
                self.prev_var_values[call_id][k] = var_snap.value_repr

            caller_line = None
            caller_code = None
            is_recursion = False

            if idx > 0:
                parent_f = active_stack[idx - 1]
                caller_line = parent_f.f_lineno
                if 1 <= caller_line <= len(self.code_lines):
                    caller_code = self.code_lines[caller_line - 1].strip()
                for prev_f in active_stack[:idx]:
                    if prev_f.f_code.co_name == f.f_code.co_name:
                        is_recursion = True
                        break

            parent_id = None
            if idx > 0:
                parent_f = active_stack[idx - 1]
                parent_id = self.frame_to_call_id.get(id(parent_f))
            elif f.f_back and id(f.f_back) in self.frame_to_call_id:
                parent_id = self.frame_to_call_id[id(f.f_back)]

            args_dict = {}
            if call_id in self.all_call_records:
                args_dict = self.all_call_records[call_id].get("args", {})
                self.all_call_records[call_id]["local_vars"] = local_vars
                self.all_call_records[call_id]["line_number"] = f.f_lineno
                self.all_call_records[call_id]["depth"] = idx
                self.all_call_records[call_id]["is_active"] = True
                self.all_call_records[call_id]["parent_call_id"] = parent_id
                self.all_call_records[call_id]["caller_line_number"] = caller_line
                self.all_call_records[call_id]["caller_code"] = caller_code
                self.all_call_records[call_id]["is_recursion"] = is_recursion
            else:
                args_dict = {k: var_snap.value_repr for k, var_snap in local_vars.items()}
                self.all_call_records[call_id] = {
                    "call_id": call_id,
                    "parent_call_id": parent_id,
                    "function_name": func_name,
                    "depth": idx,
                    "line_number": f.f_lineno,
                    "caller_line_number": caller_line,
                    "caller_code": caller_code,
                    "is_recursion": is_recursion,
                    "args": args_dict,
                    "local_vars": local_vars,
                    "return_value": None,
                    "is_active": True,
                }

            snap = FrameSnapshot(
                frame_id=call_id,
                function_name=func_name,
                line_number=f.f_lineno,
                depth=idx,
                local_vars=local_vars,
                call_id=call_id,
                parent_call_id=parent_id,
                caller_line_number=caller_line,
                caller_code=caller_code,
                is_recursion=is_recursion,
                is_active=True,
                args=args_dict,
            )
            active_frames.append(snap)

        # 2. Build complete call hierarchy (both active + completed/dull frames)
        all_frames: List[FrameSnapshot] = []
        for c_id, rec in self.all_call_records.items():
            is_active = (c_id in active_frame_ids)
            all_frames.append(FrameSnapshot(
                frame_id=c_id,
                function_name=rec["function_name"],
                line_number=rec.get("line_number", 1),
                depth=rec.get("depth", 0),
                local_vars=rec.get("local_vars", {}),
                return_value=rec.get("return_value"),
                call_id=c_id,
                parent_call_id=rec.get("parent_call_id"),
                caller_line_number=rec.get("caller_line_number"),
                caller_code=rec.get("caller_code"),
                is_recursion=rec.get("is_recursion", False),
                is_active=is_active,
                args=rec.get("args", {}),
            ))

        return active_frames, all_frames

    def _trace_hook(self, frame: FrameType, event: str, arg: Any):
        if time.time() - self.start_time > self.timeout_sec:
            raise ExecutionTimeout(f"Execution timed out ({self.timeout_sec}s limit exceeded). Possible infinite loop.")

        if len(self.steps) >= self.max_steps:
            raise StepLimitExceeded(f"Execution step limit ({self.max_steps} steps) exceeded. Possible infinite loop.")

        if frame.f_code.co_filename != self.target_code_name:
            return self._trace_hook

        # Record call events to initialize arguments
        f_ptr = id(frame)
        if event == "call":
            if f_ptr not in self.frame_to_call_id:
                self.call_counter += 1
                func_name = frame.f_code.co_name
                if func_name == "<module>":
                    func_name = "Global Scope"
                call_id = f"call_{self.call_counter}_{func_name}"
                self.frame_to_call_id[f_ptr] = call_id

                parent_id = None
                if frame.f_back and id(frame.f_back) in self.frame_to_call_id:
                    parent_id = self.frame_to_call_id[id(frame.f_back)]

                initial_args = {}
                for k, v in frame.f_locals.items():
                    if not (k.startswith("__") and k.endswith("__")) and k not in ("db", "api", "input", "safe_input"):
                        initial_args[k] = safe_repr(v)

                self.all_call_records[call_id] = {
                    "call_id": call_id,
                    "parent_call_id": parent_id,
                    "function_name": func_name,
                    "depth": 0,
                    "line_number": frame.f_lineno,
                    "args": initial_args,
                    "local_vars": {},
                    "return_value": None,
                    "is_active": True,
                }

        # Record return value in call records
        if event == "return":
            call_id = self.frame_to_call_id.get(f_ptr)
            ret_repr = safe_repr(arg)
            if call_id and call_id in self.all_call_records:
                self.all_call_records[call_id]["return_value"] = ret_repr
                self.all_call_records[call_id]["is_active"] = False

        lineno = frame.f_lineno
        line_code = self.code_lines[lineno - 1].strip() if 0 < lineno <= len(self.code_lines) else ""

        if event == "call":
            if frame.f_code.co_name != "<module>":
                self._record_step(frame, lineno, line_code, event_type="call")

        elif event == "line":
            if f_ptr in self.pending_lines:
                prev_line, prev_code = self.pending_lines.pop(f_ptr)
                self._record_step(frame, prev_line, prev_code, event_type="line")
            self.pending_lines[f_ptr] = (lineno, line_code)

        elif event == "return":
            if f_ptr in self.pending_lines:
                prev_line, prev_code = self.pending_lines.pop(f_ptr)
                self._record_step(frame, prev_line, prev_code, event_type="line")
            if frame.f_code.co_name != "<module>":
                ret_repr = safe_repr(arg)
                self._record_step(frame, lineno, line_code, event_type="return", return_value=ret_repr)
            self.frame_to_call_id.pop(f_ptr, None)

        elif event == "exception":
            if f_ptr in self.pending_lines:
                self.pending_lines.pop(f_ptr)

        return self._trace_hook

    def _record_step(self, frame: FrameType, lineno: int, line_code: str, event_type: str, return_value: Optional[str] = None):
        heap: Dict[str, HeapObject] = {}
        visited_ids: Set[int] = set()

        active_frames, all_frames = self._get_call_stack(frame, heap, visited_ids)

        current_mem, peak_mem = tracemalloc.get_traced_memory()
        prev_mem = self.steps[-1].memory.current_bytes if self.steps else 0
        mem_snap = MemorySnapshot(
            current_bytes=current_mem,
            peak_bytes=peak_mem,
            delta_bytes=current_mem - prev_mem
        )

        ext_call = None
        if self.pending_external_calls:
            ext_call = self.pending_external_calls.pop(0)

        if return_value and active_frames:
            active_frames[-1].return_value = return_value

        top_frame = active_frames[-1] if active_frames else None
        caller_line = top_frame.caller_line_number if top_frame else None
        is_rec = top_frame.is_recursion if top_frame else False

        step = TraceStep(
            step_index=len(self.steps),
            line_number=lineno,
            event_type="external" if ext_call else event_type,
            frames=active_frames,
            all_frames=all_frames,
            heap=heap,
            memory=mem_snap,
            stdout=self.stdout_buf.getvalue(),
            stderr=self.stderr_buf.getvalue(),
            external_call=ext_call,
            step_code=line_code,
            caller_line_number=caller_line,
            is_recursion=is_rec,
        )
        self.steps.append(step)


    def run(self, code_str: str) -> TraceResult:
        self.code_lines = code_str.splitlines()

        # Pre-scan with AST detector
        analysis = analyze_code(code_str)
        if not analysis.is_valid:
            err_line = analysis.error_line or 1
            line_code = self.code_lines[err_line - 1].strip() if 0 < err_line <= len(self.code_lines) else ""
            err_msg = analysis.error or "Code syntax or security error detected."
            err_step = TraceStep(
                step_index=0,
                line_number=err_line,
                event_type="exception",
                frames=[],
                all_frames=[],
                heap={},
                memory=MemorySnapshot(),
                stdout="",
                stderr=err_msg,
                caption=err_msg,
                step_code=line_code
            )
            return TraceResult(
                success=False,
                total_steps=1,
                steps=[err_step],
                error=err_msg,
                execution_time_ms=0.0
            )

        # Setup callbacks
        set_db_callback(self._on_external_call)
        set_api_callback(self._on_external_call)

        def safe_input(prompt: Any = "") -> str:
            if prompt:
                self.stdout_buf.write(str(prompt) + "\n")
            return "0"

        # Prepare globals with standard Python utilities and mocks
        from tracer.mocks.db import db
        from tracer.mocks.api import api
        exec_globals = {
            "__name__": "__main__",
            "db": db,
            "api": api,
            "input": safe_input,
        }

        # Reset DB state for clean run
        db.reset()

        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = self.stdout_buf
        sys.stderr = self.stderr_buf

        self.start_time = time.time()
        tracemalloc.start()
        error_msg: Optional[str] = None
        success = True

        err_line: Optional[int] = None
        try:
            compiled_code = compile(code_str, self.target_code_name, "exec")
            sys.settrace(self._trace_hook)
            exec(compiled_code, exec_globals)
        except StepLimitExceeded as e:
            success = False
            error_msg = str(e)
        except ExecutionTimeout as e:
            success = False
            error_msg = str(e)
        except Exception as e:
            success = False
            error_msg = f"{type(e).__name__}: {str(e)}"
            tb = e.__traceback__
            while tb:
                if tb.tb_frame.f_code.co_filename == self.target_code_name:
                    err_line = tb.tb_lineno
                tb = tb.tb_next
        finally:
            sys.settrace(None)
            tracemalloc.stop()
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            set_db_callback(None)
            set_api_callback(None)

        elapsed_ms = round((time.time() - self.start_time) * 1000, 2)

        # If an error occurred and to show final error step
        if not success and error_msg:
            last_line = err_line or (self.steps[-1].line_number if self.steps else (analysis.error_line or 1))
            line_code = self.code_lines[last_line - 1].strip() if 0 < last_line <= len(self.code_lines) else ""
            err_step = TraceStep(
                step_index=len(self.steps),
                line_number=last_line,
                event_type="exception",
                frames=self.steps[-1].frames if self.steps else [],
                all_frames=self.steps[-1].all_frames if self.steps else [],
                heap=self.steps[-1].heap if self.steps else {},
                memory=MemorySnapshot(),
                stdout=self.stdout_buf.getvalue(),
                stderr=error_msg,
                caption=f"Error encountered: {error_msg}",
                step_code=line_code
            )
            self.steps.append(err_step)

        return TraceResult(
            success=success,
            total_steps=len(self.steps),
            steps=self.steps,
            error=error_msg,
            execution_time_ms=elapsed_ms
        )

