import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from s3_mcp.server import mcp, run  # noqa: E402

__all__ = ["mcp", "run"]

if __name__ == "__main__":
    run()
