from __future__ import annotations
import ast
from typing import Dict, List, Set, Any, Optional

DISALLOWED_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "http", "http.server",
    "urllib", "requests", "pty", "ctypes", "winreg", "_winapi", "multiprocessing",
    "threading", "asyncio", "signal", "importlib", "pathlib", "tempfile",
    "glob", "webbrowser", "ftplib", "smtplib", "telnetlib", "builtins",
    "inspect", "posix", "nt", "code", "codeop", "pickle", "shelve",
    "marshal"
}

DISALLOWED_BUILTINS = {
    "eval", "exec", "compile", "open", "breakpoint", "__import__",
    "exit", "quit", "help"
}

DANGEROUS_ATTRIBUTES = {
    "__subclasses__", "__bases__", "__base__", "__globals__",
    "__code__", "__closure__", "__builtins__", "__import__",
    "__class__", "gi_frame", "f_globals", "f_locals", "cr_frame"
}

class CodeAnalysisResult:
    def __init__(self):
        self.is_valid: bool = True
        self.error: Optional[str] = None
        self.error_line: Optional[int] = None
        self.imports: List[str] = []
        self.has_loops: bool = False
        self.has_recursion: bool = False
        self.defined_functions: Set[str] = set()
        self.called_functions: Set[str] = set()
        self.uses_mock_db: bool = False
        self.uses_mock_api: bool = False

class CodeDetector(ast.NodeVisitor):
    def __init__(self):
        self.result = CodeAnalysisResult()
        self._current_function: Optional[str] = None

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.result.imports.append(alias.name)
            top_pkg = alias.name.split('.')[0]
            if top_pkg in DISALLOWED_MODULES:
                self.result.is_valid = False
                self.result.error = f"Import of restricted module '{alias.name}' is not permitted for security."
                self.result.error_line = node.lineno
                return
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module:
            self.result.imports.append(node.module)
            top_pkg = node.module.split('.')[0]
            if top_pkg in DISALLOWED_MODULES:
                self.result.is_valid = False
                self.result.error = f"Import from restricted module '{node.module}' is not permitted for security."
                self.result.error_line = node.lineno
                return
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        self.result.has_loops = True
        self.generic_visit(node)

    def visit_While(self, node: ast.While):
        self.result.has_loops = True
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.result.defined_functions.add(node.name)
        prev_func = self._current_function
        self._current_function = node.name
        self.generic_visit(node)
        self._current_function = prev_func

    def visit_Call(self, node: ast.Call):
        func_name = None
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in DISALLOWED_BUILTINS:
                self.result.is_valid = False
                self.result.error = f"Calling restricted function '{func_name}' is not permitted."
                self.result.error_line = node.lineno
                return
            if self._current_function and func_name == self._current_function:
                self.result.has_recursion = True
        elif isinstance(node.func, ast.Attribute):
            # Check for mock db or api calls
            val = node.func.value
            attr = node.func.attr
            if isinstance(val, ast.Name):
                if val.id in ("db", "database"):
                    self.result.uses_mock_db = True
                elif val.id in ("api", "requests", "http"):
                    self.result.uses_mock_api = True
            func_name = attr

        if func_name:
            self.result.called_functions.add(func_name)

        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        if node.attr in DANGEROUS_ATTRIBUTES:
            self.result.is_valid = False
            self.result.error = f"Access to restricted attribute '{node.attr}' is not permitted for security."
            self.result.error_line = node.lineno
            return
        self.generic_visit(node)

def analyze_code(source_code: str) -> CodeAnalysisResult:
    detector = CodeDetector()
    try:
        tree = ast.parse(source_code)
        detector.visit(tree)
    except SyntaxError as se:
        res = CodeAnalysisResult()
        res.is_valid = False
        res.error = f"SyntaxError: {se.msg} at line {se.lineno}"
        res.error_line = se.lineno
        return res
    except Exception as e:
        res = CodeAnalysisResult()
        res.is_valid = False
        res.error = f"Failed to parse code: {str(e)}"
        return res

    return detector.result
