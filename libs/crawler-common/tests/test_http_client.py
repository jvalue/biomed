"""Tests for HTTP client."""

import pytest
from unittest.mock import AsyncMock, patch

from crawler_common.http_client import HttpClient
from crawler_common.models import CrawlRequest


@pytest.mark.asyncio
async def test_http_client_initialization():
    """Test HttpClient initialization with default values."""
    client = HttpClient()
    assert client.max_retries == 3
    assert client.timeout == 30
    assert "User-Agent" in client.default_headers


@pytest.mark.asyncio
async def test_http_client_custom_config():
    """Test HttpClient with custom configuration."""
    client = HttpClient(
        max_retries=5,
        timeout=60,
        headers={"Custom-Header": "value"},
    )
    assert client.max_retries == 5
    assert client.timeout == 60
    assert client.default_headers["Custom-Header"] == "value"


# Add more integration tests with mocked httpx responses as needed
