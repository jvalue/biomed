"""S3 resolvers — delegates to the existing S3BucketService."""

from __future__ import annotations

from graphql_api.schema.types import (
    S3ListResult,
    S3Object,
    S3ObjectContent,
    S3ObjectMetadata,
)
from graphql_api.services.s3 import (
    S3BucketService,
    load_settings,
)

# ---------------------------------------------------------------------------
# Service factory (lazy singleton)
# ---------------------------------------------------------------------------

_service: S3BucketService | None = None


def _get_service() -> S3BucketService:
    """Return a shared S3BucketService instance, created on first call."""
    global _service
    if _service is None:
        settings = load_settings()
        _service = S3BucketService(settings)
    return _service


def set_service(service: S3BucketService) -> None:
    """Override the shared service instance (useful for testing)."""
    global _service
    _service = service


# ---------------------------------------------------------------------------
# Resolver functions
# ---------------------------------------------------------------------------


def resolve_s3_objects(
    prefix: str = "",
    delimiter: str = "/",
    max_keys: int = 100,
) -> S3ListResult:
    """List objects in the S3 bucket."""
    result = _get_service().list_objects(
        prefix=prefix, delimiter=delimiter, max_keys=max_keys
    )
    return S3ListResult(
        bucket=result["bucket"],
        prefix=result["prefix"],
        delimiter=result["delimiter"],
        count=result["count"],
        objects=[
            S3Object(
                key=obj["key"],
                size=obj["size"],
                last_modified=obj.get("last_modified"),
                etag=obj.get("etag"),
                content_type=obj.get("content_type"),
            )
            for obj in result["objects"]
        ],
        prefixes=result.get("prefixes", []),
        is_truncated=result.get("is_truncated", False),
        next_continuation_token=result.get("next_continuation_token"),
    )


def resolve_s3_object_metadata(key: str) -> S3ObjectMetadata:
    """Get metadata for a single S3 object."""
    result = _get_service().get_object_metadata(key)
    return S3ObjectMetadata(
        bucket=result["bucket"],
        key=result["key"],
        content_length=result.get("content_length"),
        content_type=result.get("content_type"),
        etag=result.get("etag"),
        last_modified=result.get("last_modified"),
        metadata=result.get("metadata"),
    )


def resolve_s3_object_content(key: str) -> S3ObjectContent:
    """Read the content of an S3 object.

    For text-based objects (XML, JSON, etc.) the content is returned as a
    string.  Binary objects are flagged with ``is_binary=True`` and content
    is set to ``None``.
    """
    service = _get_service()
    metadata = service.get_object_metadata(key)
    content = service.read_object(key)

    if isinstance(content, bytes):
        return S3ObjectContent(
            key=key,
            content=None,
            is_binary=True,
            size=metadata.get("content_length", 0) or 0,
        )

    return S3ObjectContent(
        key=key,
        content=content,
        is_binary=False,
        size=len(content.encode("utf-8")) if content else 0,
    )
