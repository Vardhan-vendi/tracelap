import pytest
import sys
import os

# Ensure tracer package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tracer.engine import ExecutionTracer

def test_basic_variable_assignment():
    code = """
x = 10
y = 20
z = x + y
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    assert res.total_steps > 0
    # Last step should have z = 30
    last_frame = res.steps[-1].frames[0]
    assert "z" in last_frame.local_vars
    assert last_frame.local_vars["z"].value_repr == "30"

def test_loop_and_list_accumulation():
    code = """
items = []
for i in range(3):
    items.append(i * 2)
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    last_step = res.steps[-1]
    last_frame = last_step.frames[0]
    assert "items" in last_frame.local_vars
    assert last_frame.local_vars["items"].is_pointer is True
    obj_id = last_frame.local_vars["items"].object_id
    assert obj_id in last_step.heap
    assert len(last_step.heap[obj_id].elements) == 3

def test_object_aliasing_reference_identity():
    code = """
list1 = [1, 2, 3]
list2 = list1
list2.append(4)
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    last_step = res.steps[-1]
    frame = last_step.frames[0]
    assert frame.local_vars["list1"].object_id == frame.local_vars["list2"].object_id
    shared_id = frame.local_vars["list1"].object_id
    assert len(last_step.heap[shared_id].elements) == 4

def test_function_call_and_stack_depth():
    code = """
def add(a, b):
    return a + b

res = add(5, 7)
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    # At least one step should have stack depth >= 2
    max_depth = max(len(step.frames) for step in res.steps)
    assert max_depth >= 2

def test_recursion_fibonacci():
    code = """
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

ans = fib(3)
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is True
    last_frame = res.steps[-1].frames[0]
    assert last_frame.local_vars["ans"].value_repr == "2"
    # Check recursion call tracking
    recursive_steps = [s for s in res.steps if s.is_recursion]
    assert len(recursive_steps) > 0
    assert any(s.caller_line_number == 5 for s in recursive_steps)
    # Check that caller_code on frame captures the recursive line
    assert any(f.caller_code and "fib(" in f.caller_code for s in recursive_steps for f in s.frames if f.is_recursion)

def test_step_limit_infinite_loop():
    code = """
while True:
    pass
"""
    tracer = ExecutionTracer(max_steps=50)
    res = tracer.run(code)
    assert res.success is False
    assert "step limit" in res.error.lower()

def test_runtime_exception():
    code = """
a = 10
b = 0
c = a / b
"""
    tracer = ExecutionTracer()
    res = tracer.run(code)
    assert res.success is False
    assert "ZeroDivisionError" in res.error

def test_branching_recursion_tree():
    code = """
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
result = fib(4)
"""
    t = ExecutionTracer()
    res = t.run(code)
    assert res.success is True
    last_step = res.steps[-1]
    # For fib(4), 1 Global Scope + 9 fib calls = 10 total frames in call history
    fib_frames = [f for f in last_step.all_frames if f.function_name == "fib"]
    assert len(fib_frames) == 9
    root_fib = [f for f in fib_frames if f.args.get("n") == "4"][0]
    assert root_fib.return_value == "3"
    # Root fib(4) should have two children: fib(3) and fib(2)
    children_of_root = [f for f in fib_frames if f.parent_call_id == root_fib.call_id]
    assert len(children_of_root) == 2
    child_args = sorted([c.args.get("n") for c in children_of_root])
    assert child_args == ["2", "3"]

