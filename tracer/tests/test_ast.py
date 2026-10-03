import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tracer.detector import analyze_code

def test_ast_valid_code():
    res = analyze_code("x = 10\nfor i in range(5):\n    x += i")
    assert res.is_valid is True
    assert res.has_loops is True
    assert res.error is None

def test_ast_forbidden_module():
    res = analyze_code("import subprocess\nsubprocess.run(['ls'])")
    assert res.is_valid is False
    assert "subprocess" in res.error

def test_ast_forbidden_os():
    res = analyze_code("import os\nos.system('dir')")
    assert res.is_valid is False
    assert "os" in res.error

def test_ast_syntax_error():
    res = analyze_code("def broken_syntax(:\n    pass")
    assert res.is_valid is False
    assert "SyntaxError" in res.error

def test_ast_mock_detection():
    res = analyze_code("users = db.query('SELECT * FROM users')\nresp = api.get('https://example.com')")
    assert res.is_valid is True
    assert res.uses_mock_db is True
    assert res.uses_mock_api is True

def test_ast_forbidden_attributes():
    res = analyze_code("x = ().__class__.__bases__[0].__subclasses__()")
    assert res.is_valid is False
    assert "restricted attribute" in res.error

def test_ast_forbidden_importlib():
    res = analyze_code("import importlib\nimportlib.import_module('os')")
    assert res.is_valid is False
    assert "importlib" in res.error
