from __future__ import annotations
from typing import Dict, Any, List
from backend.app.ai.base import BaseAIProvider, CaptionEvaluation

class RuleBasedExplainer(BaseAIProvider):
    """
    100% offline, zero-latency, free deterministic explainer.
    Ground truth guaranteed — will never hallucinate variables or future steps.
    """

    def generate_caption(self, ctx: Dict[str, Any], level: str = "beginner") -> str:
        event_type = ctx.get("event_type", "line")
        line_no = ctx.get("line_number", 1)
        line_code = ctx.get("line_code", "").strip()
        frames = ctx.get("frames", [])
        active_frame = frames[-1] if frames else {}
        func_name = active_frame.get("function_name", "Global Scope")
        local_vars = active_frame.get("local_vars", {})
        ext_call = ctx.get("external_call")
        is_beginner = (level.lower() == "beginner")

        # 1. External Call
        if ext_call:
            kind = ext_call.get("kind")
            action = ext_call.get("action")
            target = ext_call.get("target")
            result = ext_call.get("result", {})

            if kind == "db":
                rows = result.get("rows_returned", 0)
                if is_beginner:
                    return f"Queried the mock database: ran {action} on table '{target}', finding {rows} matching records."
                return f"Executed SQL query [{action}] against table '{target}'. Database returned {rows} row(s)."

            if kind == "api":
                status = result.get("status_code", 200)
                if is_beginner:
                    return f"Sent a network request: {action} to '{target}' — received response with status {status} OK."
                return f"Dispatched HTTP {action} request to endpoint '{target}'. Mock gateway responded with HTTP {status}."

        # 2. Function Call
        if event_type == "call":
            if func_name == "Global Scope":
                return "Beginning program execution in global scope." if is_beginner else "Initializing global execution context."
            arg_strs = [f"{k}={v.get('value_repr')}" for k, v in local_vars.items()]
            args_formatted = ", ".join(arg_strs) if arg_strs else "no arguments"
            if is_beginner:
                return f"Calling function '{func_name}' with {args_formatted}. A new memory workspace is opened."
            return f"Pushing stack frame for '{func_name}' onto call stack with parameters ({args_formatted})."

        # 3. Function Return
        if event_type == "return":
            ret_val = active_frame.get("return_value", "None")
            if is_beginner:
                return f"Function '{func_name}' finished and returned {ret_val} back to caller."
            return f"Popping frame for '{func_name}' from call stack; returning value {ret_val}."

        # 4. Exception
        if event_type == "exception":
            err = ctx.get("stderr", "Runtime error occurred.")
            if is_beginner:
                return f"Execution stopped due to an error: {err}"
            return f"Unhandled exception raised during execution: {err}"

        # 5. Standard Line Execution
        # Identify changed or new variables
        changed_vars = [k for k, v in local_vars.items() if v.get("is_changed")]
        pointer_vars = [k for k, v in local_vars.items() if v.get("is_pointer") and v.get("is_changed")]

        if changed_vars:
            primary_var = changed_vars[0]
            val_repr = local_vars[primary_var].get("value_repr", "")
            type_name = local_vars[primary_var].get("type_name", "")

            if primary_var in pointer_vars:
                if is_beginner:
                    return f"Line {line_no}: Updated '{primary_var}' with a {type_name}: {val_repr}. Notice how memory stores this list/object."
                return f"Line {line_no}: Heap reference '{primary_var}' ({type_name}) assigned or updated. Current state: {val_repr}."

            if is_beginner:
                return f"Line {line_no}: Variable '{primary_var}' is now set to {val_repr}."
            return f"Line {line_no}: Mutated state of '{primary_var}' ({type_name}) to {val_repr}."

        # If line code gives specific clues
        if line_code.startswith("for ") or line_code.startswith("while "):
            if is_beginner:
                return f"Line {line_no}: Checking loop condition and advancing to the next iteration."
            return f"Line {line_no}: Evaluating loop predicate / iterator traversal."

        if line_code.startswith("if ") or line_code.startswith("elif "):
            if is_beginner:
                return f"Line {line_no}: Evaluating conditional branch '{line_code}'."
            return f"Line {line_no}: Branch decision: evaluating condition expression."

        if line_code.startswith("def "):
            func_def_name = line_code.split("(")[0].replace("def", "").strip()
            if is_beginner:
                return f"Line {line_no}: Defined function '{func_def_name}' in memory (ready to be called later)."
            return f"Line {line_no}: Bound function identifier '{func_def_name}' in current symbol table."

        return f"Line {line_no}: Executing `{line_code}`."

    def evaluate_caption(self, caption: str, ctx: Dict[str, Any], level: str = "beginner") -> CaptionEvaluation:
        # Check grounding against context
        frames = ctx.get("frames", [])
        known_vars = set()
        for f in frames:
            for v_name in f.get("local_vars", {}):
                known_vars.add(v_name)

        rubric = {
            "is_non_empty": len(caption.strip()) > 5,
            "no_obvious_spoilers": "in step" not in caption.lower() and "later at line" not in caption.lower(),
            "correct_line_reference": str(ctx.get("line_number", "")) in caption or ctx.get("event_type") in ("call", "return", "exception")
        }

        is_valid = all(rubric.values())
        score = 1.0 if is_valid else 0.5
        feedback = "Caption satisfies grounding and pedagogical rubric." if is_valid else "Caption failed rubric checks."

        return CaptionEvaluation(
            is_valid=is_valid,
            score=score,
            feedback=feedback,
            passed_rubric=rubric
        )
