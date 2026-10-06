"""Entry point for the Biomed GraphQL API server."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

APP_DIR = Path(__file__).resolve().parent
load_dotenv(APP_DIR / ".env")


def main() -> None:
    import uvicorn

    from graphql_api.app import app

    host = os.getenv("GRAPHQL_HOST", "0.0.0.0")
    port = int(os.getenv("GRAPHQL_PORT", "8003"))

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
