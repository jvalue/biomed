"""Pydantic models for crawler APIs."""

from datetime import datetime, timezone

from pydantic import BaseModel, Field, HttpUrl, field_serializer


class CrawlRequest(BaseModel):
    """Request model for crawling a URL."""

    url: HttpUrl
    method: str = "GET"
    headers: dict[str, str] | None = None
    timeout: int = 30


class CrawlResponse(BaseModel):
    """Response model from a crawl operation."""

    url: str
    status_code: int
    content: str
    content_type: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: float

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format."""
        return value.isoformat()
