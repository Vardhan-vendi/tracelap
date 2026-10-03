"""Vercel Serverless Function entrypoint for Code Flow Visualizer (TRACELAP)."""
import sys
import os

# Ensure root repository directory and tracer directory are on sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

TRACER_DIR = os.path.join(ROOT_DIR, "tracer")
if TRACER_DIR not in sys.path:
    sys.path.insert(0, TRACER_DIR)

from backend.app.main import app

# Export for Vercel ASGI runtime
__all__ = ["app"]
