"""Tests for HTTP client."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from crawler_common.http_client import HttpClient


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


@pytest.mark.asyncio
async def test_call_api_endpoint_sends_api_key_header():
    """Test authenticated API endpoint helper adds API key header and calls expected URL."""
    client = HttpClient(timeout=20)

    with patch("crawler_common.http_client.httpx.AsyncClient") as mock_async_client:
        mock_response = AsyncMock()
        mock_response.raise_for_status = Mock()

        mock_client_instance = AsyncMock()
        mock_client_instance.request = AsyncMock(return_value=mock_response)
        mock_async_client.return_value.__aenter__.return_value = mock_client_instance

        response = await client.call_api_endpoint(
            base_url="https://api.example.com/",
            endpoint="api/v1/crawler-runs",
            api_key="test-key",
            method="post",
            json_body={"status": "DONE"},
            params={"source": "crawler"},
        )

        assert response is mock_response
        mock_client_instance.request.assert_awaited_once_with(
            method="POST",
            url="https://api.example.com/api/v1/crawler-runs",
            headers={
                "User-Agent": "CrawlerBot/1.0",
                "X-API-KEY": "test-key",
                "Accept": "application/json",
            },
            json={"status": "DONE"},
            params={"source": "crawler"},
        )


@pytest.mark.asyncio
async def test_call_management_endpoint_from_env_uses_configured_env_vars(monkeypatch):
    """Test environment-based helper delegates with values from environment."""
    client = HttpClient(timeout=20)
    monkeypatch.setenv("MANAGEMENT_BACKEND_URL", "https://cluster.example.com")
    monkeypatch.setenv("MANAGEMENT_API_KEY", "cluster-key")

    with patch.object(client, "call_api_endpoint", new=AsyncMock()) as mock_call:
        await client.call_management_endpoint_from_env(
            endpoint="/api/v1/crawler-runs",
            method="PATCH",
            json_body={"state": "RUNNING"},
            params={"id": "123"},
        )

        mock_call.assert_awaited_once_with(
            base_url="https://cluster.example.com",
            endpoint="/api/v1/crawler-runs",
            api_key="cluster-key",
            method="PATCH",
            json_body={"state": "RUNNING"},
            params={"id": "123"},
        )


@pytest.mark.asyncio
async def test_call_management_endpoint_from_env_raises_when_env_missing(monkeypatch):
    """Test environment-based helper fails fast when required vars are missing."""
    client = HttpClient()
    monkeypatch.delenv("MANAGEMENT_BACKEND_URL", raising=False)
    monkeypatch.delenv("MANAGEMENT_API_KEY", raising=False)

    with pytest.raises(ValueError, match="MANAGEMENT_BACKEND_URL"):
        await client.call_management_endpoint_from_env(endpoint="/api/v1/crawler-runs")
