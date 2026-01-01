#!/usr/bin/env python3
"""Test script to verify FastAPI app can be imported"""

import sys
import os

# Add repo root to path
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, repo_root)

try:
    from main import app
    print("[OK] main.py imports successfully")
    print(f"[OK] FastAPI app imported: {type(app).__name__}")
    print(f"[OK] App routes: {len(app.routes)} routes registered")
    
    # List route methods
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            for method in route.methods:
                routes.append(f"{method} {route.path}")
    
    print(f"\nAvailable routes:")
    for route in sorted(routes):
        print(f"  {route}")
    
    sys.exit(0)
except Exception as e:
    print(f"[ERROR] Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
