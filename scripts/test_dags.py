#!/usr/bin/env python3
"""Validate DAG integrity by compiling all DAG files."""

import sys
from pathlib import Path

sys.path.insert(0, "dags")

success = True
for dag_file in Path("dags").glob("**/*.py"):
    if dag_file.name.startswith("_"):
        continue

    try:
        print(f"Testing {dag_file}...")
        with dag_file.open() as f:
            compile(f.read(), str(dag_file), "exec")
        print(f"✓ {dag_file} is valid")
    except Exception as e:
        print(f"✗ {dag_file} failed: {e}")
        success = False

sys.exit(0 if success else 1)
