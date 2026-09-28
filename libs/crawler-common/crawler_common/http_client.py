"""HTTP client with retry logic and error handling."""

import asyncio
import os
import time
from typing import Any

import httpx

from crawler_common.models.api import CrawlRequest, CrawlResponse


class HttpClient:
    """Async HTTP client for crawling with retry logic."""

    def __init__(
        self,
        max_retries: int = 3,
        timeout: int = 30,
        headers: dict[str, str] | None = None,
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

                except httpx.HTTPError:
                    if attempt == self.max_retries - 1:
                        raise
                    # Exponential backoff
                    await asyncio.sleep(2**attempt)

        raise httpx.HTTPError(
            f"Failed to fetch {request.url} after {self.max_retries} attempts"
        )

    async def call_api_endpoint(
        self,
        base_url: str,
        endpoint: str,
        api_key: str,
        method: str = "GET",
        json_body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
    ) -> httpx.Response:
        """
        Call a management API endpoint using API key authentication.

        Args:
            base_url: Base backend URL (e.g. ``https://api.example.com``)
            endpoint: Endpoint path (e.g. ``/api/v1/crawler-runs``)
            api_key: Raw API key used for ``X-API-KEY`` header
            method: HTTP method
            json_body: Optional JSON request body
            params: Optional query parameters

        Returns:
            The HTTP response object with successful status code.

        Raises:
            httpx.HTTPStatusError: If endpoint returns non-2xx status.
            httpx.RequestError: If request fails due to network/protocol errors.
        """
        normalized_base_url = base_url.rstrip("/")
        normalized_endpoint = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        url = f"{normalized_base_url}{normalized_endpoint}"

        headers = {
            **self.default_headers,
            "X-API-KEY": api_key,
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=json_body,
                params=params,
            )
            response.raise_for_status()
            return response

    async def call_management_endpoint_from_env(
        self,
        endpoint: str,
        method: str = "GET",
        json_body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
        base_url_env_var: str = "MANAGEMENT_BACKEND_URL",
        api_key_env_var: str = "MANAGEMENT_API_KEY",
    ) -> httpx.Response:
        """
        Call a management API endpoint using environment-based configuration.

        Args:
            endpoint: Endpoint path (e.g. ``/api/v1/crawler-runs``)
            method: HTTP method
            json_body: Optional JSON request body
            params: Optional query parameters
            base_url_env_var: Environment variable containing backend base URL
            api_key_env_var: Environment variable containing API key

        Returns:
            The HTTP response object with successful status code.

        Raises:
            ValueError: If required environment variables are missing.
            httpx.HTTPStatusError: If endpoint returns non-2xx status.
            httpx.RequestError: If request fails due to network/protocol errors.
        """
        base_url = os.getenv(base_url_env_var)
        if not base_url:
            raise ValueError(
                f"Missing required environment variable: {base_url_env_var}"
            )

        api_key = os.getenv(api_key_env_var)
        if not api_key:
            raise ValueError(
                f"Missing required environment variable: {api_key_env_var}"
            )

        return await self.call_api_endpoint(
            base_url=base_url,
            endpoint=endpoint,
            api_key=api_key,
            method=method,
            json_body=json_body,
            params=params,
        )
