"""Simple HTTP quickstart example for crawler-common.

Run with:

  python -m examples.quickstart_http

This example shows how to use `HttpClient` and `CrawlRequest` to fetch a URL.
"""

import asyncio
import sys

from crawler_common.http_client import HttpClient
from crawler_common.models.api import CrawlRequest


async def main() -> int:
    client = HttpClient()
    req = CrawlRequest(url="https://example.com")
    try:
        resp = await client.fetch(req)
        print("URL:", resp.url)
        print("Status:", resp.status_code)
        print("Content-Type:", resp.content_type)
        print("Duration (ms):", resp.duration_ms)
        snippet = resp.content[:200]
        print("Content (snippet):\n", snippet)
        return 0
    except Exception as exc:  # pragma: no cover - example
        print("Request failed:", exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
