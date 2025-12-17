"""Common data models for crawler applications."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, field_serializer, HttpUrl


class CrawlRequest(BaseModel):
    """Request model for crawling a URL."""

    url: HttpUrl
    method: str = "GET"
    headers: Optional[dict[str, str]] = None
    timeout: int = 30


class CrawlResponse(BaseModel):
    """Response model from a crawl operation."""

    url: str
    status_code: int
    content: str
    content_type: Optional[str] = None
    timestamp: datetime = datetime.now(timezone.utc)
    duration_ms: float

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat()
