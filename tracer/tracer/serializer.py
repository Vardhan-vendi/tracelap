from __future__ import annotations
from typing import Any, Dict, Set, Tuple
import inspect
from tracer.schema import VariableSnapshot, HeapObject

PRIMITIVE_TYPES = (int, float, bool, str, type(None))

def is_primitive(val: Any) -> bool:
    return isinstance(val, PRIMITIVE_TYPES)

def safe_repr(val: Any, max_len: int = 80) -> str:
    try:
        r = repr(val)
        if len(r) > max_len:
            return r[:max_len - 3] + "..."
        return r
    except Exception:
        return f"<{type(val).__name__} instance>"

class StateSerializer:
    def __init__(self, max_depth: int = 4):
        self.max_depth = max_depth

    def serialize_variable(
        self,
        name: str,
        val: Any,
        heap: Dict[str, HeapObject],
        visited: Set[int],
        prev_val_repr: str = None
    ) -> VariableSnapshot:
        type_name = type(val).__name__
        val_repr = safe_repr(val)
        is_changed = (prev_val_repr is not None and prev_val_repr != val_repr)

        if is_primitive(val) or inspect.isfunction(val) or inspect.isclass(val) or inspect.ismodule(val):
            val_display = val_repr
            if inspect.isfunction(val):
                val_display = f"def {getattr(val, '__name__', name)}()"
            elif inspect.isclass(val):
                val_display = f"class {getattr(val, '__name__', name)}"
            return VariableSnapshot(
                name=name,
                type_name=type_name,
                value_repr=val_display,
                object_id=None,
                is_changed=is_changed,
                is_pointer=False
            )

        # Non-primitive object stored in heap
        obj_id = str(id(val))
        self._record_heap_object(val, obj_id, heap, visited, depth=0)

        return VariableSnapshot(
            name=name,
            type_name=type_name,
            value_repr=val_repr,
            object_id=obj_id,
            is_changed=is_changed,
            is_pointer=True
        )

    def _record_heap_object(
        self,
        obj: Any,
        obj_id: str,
        heap: Dict[str, HeapObject],
        visited: Set[int],
        depth: int
    ) -> None:
        raw_id = id(obj)
        if raw_id in visited or depth > self.max_depth:
            return
        visited.add(raw_id)

        type_name = type(obj).__name__
        repr_val = safe_repr(obj)

        if isinstance(obj, (list, tuple, set)):
            elements = []
            for item in obj:
                if is_primitive(item):
                    elements.append({"type": type(item).__name__, "value": safe_repr(item), "is_ref": False})
                else:
                    item_id = str(id(item))
                    elements.append({"type": type(item).__name__, "object_id": item_id, "value": safe_repr(item), "is_ref": True})
                    self._record_heap_object(item, item_id, heap, visited, depth + 1)
            heap[obj_id] = HeapObject(
                object_id=obj_id,
                type_name=type_name,
                repr_value=repr_val,
                elements=elements
            )
        elif isinstance(obj, dict):
            key_values = {}
            for k, v in list(obj.items())[:30]:  # limit to 30 items
                k_str = safe_repr(k)
                if is_primitive(v):
                    key_values[k_str] = {"type": type(v).__name__, "value": safe_repr(v), "is_ref": False}
                else:
                    v_id = str(id(v))
                    key_values[k_str] = {"type": type(v).__name__, "object_id": v_id, "value": safe_repr(v), "is_ref": True}
                    self._record_heap_object(v, v_id, heap, visited, depth + 1)
            heap[obj_id] = HeapObject(
                object_id=obj_id,
                type_name=type_name,
                repr_value=repr_val,
                key_values=key_values
            )
        elif hasattr(obj, "__dict__"):
            attrs = {}
            for k, v in list(obj.__dict__.items())[:30]:
                if k.startswith("_"):
                    continue
                k_str = str(k)
                if is_primitive(v):
                    attrs[k_str] = {"type": type(v).__name__, "value": safe_repr(v), "is_ref": False}
                else:
                    v_id = str(id(v))
                    attrs[k_str] = {"type": type(v).__name__, "object_id": v_id, "value": safe_repr(v), "is_ref": True}
                    self._record_heap_object(v, v_id, heap, visited, depth + 1)
            is_tree = any(k in attrs for k in ("left", "right", "next", "prev", "children", "child"))
            heap[obj_id] = HeapObject(
                object_id=obj_id,
                type_name=type_name,
                repr_value=repr_val,
                attributes=attrs,
                is_tree_node=is_tree
            )
        else:
            heap[obj_id] = HeapObject(
                object_id=obj_id,
                type_name=type_name,
                repr_value=repr_val
            )
