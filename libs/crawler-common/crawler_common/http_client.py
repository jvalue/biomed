"""HTTP client with retry logic and error handling."""

import asyncio
from typing import Optional
import time

import httpx

from crawler_common.models.api import CrawlRequest, CrawlResponse


class HttpClient:
    """Async HTTP client for crawling with retry logic."""

    def __init__(
        self,
        max_retries: int = 3,
        timeout: int = 30,
        headers: Optional[dict[str, str]] = None,
    ):
        self.max_retries = max_retries
        self.timeout = timeout
        self.default_headers = headers or {
            "User-Agent": "CrawlerBot/1.0",
        }

    async def fetch(self, request: CrawlRequest) -> CrawlResponse:
        """
        Fetch a URL with retry logic.

        Args:
            request: CrawlRequest object with URL and options

        Returns:
            CrawlResponse with content and metadata

        Raises:
            httpx.HTTPError: If all retries fail
        """
        headers = {**self.default_headers, **(request.headers or {})}

        async with httpx.AsyncClient(timeout=request.timeout) as client:
            for attempt in range(self.max_retries):
                try:
                    start_time = time.time()
                    response = await client.request(
                        method=request.method,
                        url=str(request.url),
                        headers=headers,
                    )
                    response.raise_for_status()
                    duration_ms = (time.time() - start_time) * 1000

                    return CrawlResponse(
                        url=str(response.url),
                        status_code=response.status_code,
                        content=response.text,
                        content_type=response.headers.get("content-type"),
                        duration_ms=duration_ms,
                    )

                except httpx.HTTPError as e:
                    if attempt == self.max_retries - 1:
                        raise
                    # Exponential backoff
                    await asyncio.sleep(2**attempt)

        raise httpx.HTTPError(f"Failed to fetch {request.url} after {self.max_retries} attempts")
