"""Tests for data models."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from crawler_common.models.api import CrawlRequest, CrawlResponse


def test_crawl_request_valid(sample_url):
    """Test creating a valid CrawlRequest."""
    request = CrawlRequest(url=sample_url)
    assert str(request.url) == sample_url + "/"
    assert request.method == "GET"
    assert request.timeout == 30


def test_crawl_request_invalid_url():
    """Test CrawlRequest with invalid URL."""
    with pytest.raises(ValidationError):
        CrawlRequest(url="not-a-url")  # type: ignore[arg-type]


def test_crawl_response_creation():
    """Test creating a CrawlResponse."""
    response = CrawlResponse(
        url="https://example.com",
        status_code=200,
        content="<html>Test</html>",
        content_type="text/html",
        duration_ms=123.45,
    )
    assert response.status_code == 200
    assert response.content == "<html>Test</html>"
    assert isinstance(response.timestamp, datetime)
