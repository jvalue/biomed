from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

from botocore.exceptions import BotoCoreError, ClientError, EndpointConnectionError
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from crawler_common.s3.client import create_s3_client


DEFAULT_ENDPOINT_URL = "http://localhost:9000"
DEFAULT_BUCKET_NAME = "biomed-data"
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_MAX_LIST_KEYS = 200
DEFAULT_MAX_READ_BYTES = 5 * 1024 * 1024
TEXT_CONTENT_TYPES = (
    "text/",
    "application/json",
    "application/xml",
    "application/xhtml+xml",
    "application/x-yaml",
    "application/yaml",
)


@dataclass(frozen=True, slots=True)
class S3McpSettings:
    endpoint_url: str
    bucket_name: str
    timeout_seconds: int
    max_list_keys: int
    max_read_bytes: int
    allowed_prefixes: tuple[str, ...]


@dataclass(slots=True)
class S3BucketObject:
    key: str
    size: int
    last_modified: str | None
    etag: str | None
    content_type: str | None
    resource_uri: str


APP_DIR = Path(__file__).resolve().parents[1]
load_dotenv(APP_DIR / ".env")


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        return default


def _env_prefixes(name: str) -> tuple[str, ...]:
    raw_value = os.getenv(name, "")
    prefixes = [prefix.strip().lstrip("/") for prefix in raw_value.split(",")]
    return tuple(prefix for prefix in prefixes if prefix)


def load_settings() -> S3McpSettings:
    return S3McpSettings(
        endpoint_url=os.getenv("S3_ENDPOINT_URL", DEFAULT_ENDPOINT_URL),
        bucket_name=os.getenv("S3_BUCKET", DEFAULT_BUCKET_NAME),
        timeout_seconds=_env_int("S3_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS),
        max_list_keys=_env_int("S3_MAX_LIST_KEYS", DEFAULT_MAX_LIST_KEYS),
        max_read_bytes=_env_int("S3_MAX_READ_BYTES", DEFAULT_MAX_READ_BYTES),
        allowed_prefixes=_env_prefixes("S3_ALLOWED_PREFIXES"),
    )


class S3BucketService:
    def __init__(self, settings: S3McpSettings, client: Any | None = None) -> None:
        self._settings = settings
        self._client = client or create_s3_client(
            endpoint_url=settings.endpoint_url,
            timeout_seconds=settings.timeout_seconds,
        )

    def list_objects(
        self,
        prefix: str = "",
        delimiter: str = "/",
        max_keys: int | None = None,
    ) -> dict[str, Any]:
        normalized_prefix = self._normalize_prefix(prefix)
        self._assert_prefix_allowed(normalized_prefix)

        response = self._client.list_objects_v2(
            Bucket=self._settings.bucket_name,
            Prefix=normalized_prefix,
            Delimiter=delimiter or "/",
            MaxKeys=self._coerce_max_keys(max_keys),
        )

        objects = [self._object_from_listing(item) for item in response.get("Contents", [])]
        prefixes = [
            entry.get("Prefix", "")
            for entry in response.get("CommonPrefixes", [])
            if entry.get("Prefix")
        ]

        return {
            "bucket": self._settings.bucket_name,
            "prefix": normalized_prefix,
            "delimiter": delimiter or "/",
            "count": len(objects),
            "objects": [self._object_to_dict(item) for item in objects],
            "prefixes": prefixes,
            "is_truncated": bool(response.get("IsTruncated", False)),
            "next_continuation_token": response.get("NextContinuationToken"),
        }

    def get_object_metadata(self, key: str) -> dict[str, Any]:
        normalized_key = self._normalize_key(key)
        self._assert_prefix_allowed(normalized_key)

        response = self._client.head_object(
            Bucket=self._settings.bucket_name,
            Key=normalized_key,
        )

        return {
            "bucket": self._settings.bucket_name,
            "key": normalized_key,
            "content_length": response.get("ContentLength"),
            "content_type": response.get("ContentType"),
            "etag": response.get("ETag"),
            "last_modified": self._to_iso_string(response.get("LastModified")),
            "metadata": response.get("Metadata", {}),
        }

    def read_object(self, key: str) -> str | bytes:
        normalized_key = self._normalize_key(key)
        self._assert_prefix_allowed(normalized_key)

        try:
            response = self._client.get_object(
                Bucket=self._settings.bucket_name,
                Key=normalized_key,
            )
        except (ClientError, EndpointConnectionError, BotoCoreError) as exc:
            raise RuntimeError(
                f"Failed to read s3://{self._settings.bucket_name}/{normalized_key}: {exc}"
            ) from exc

        payload = response["Body"].read()
        if len(payload) > self._settings.max_read_bytes:
            raise ValueError(
                f"Object s3://{self._settings.bucket_name}/{normalized_key} is larger than the "
                f"configured limit of {self._settings.max_read_bytes} bytes"
            )

        content_type = str(response.get("ContentType") or "")
        if self._looks_like_text(content_type, payload):
            return payload.decode("utf-8")

        return payload

    def _object_from_listing(self, item: dict[str, Any]) -> S3BucketObject:
        key = str(item.get("Key", ""))
        return S3BucketObject(
            key=key,
            size=int(item.get("Size", 0)),
            last_modified=self._to_iso_string(item.get("LastModified")),
            etag=item.get("ETag"),
            content_type=item.get("ContentType"),
            resource_uri=self._resource_uri(key),
        )

    def _object_to_dict(self, item: S3BucketObject) -> dict[str, Any]:
        return {
            "key": item.key,
            "size": item.size,
            "last_modified": item.last_modified,
            "etag": item.etag,
            "content_type": item.content_type,
            "resource_uri": item.resource_uri,
        }

    def _resource_uri(self, key: str) -> str:
        return f"s3://bucket/{quote(key, safe='')}"

    def _coerce_max_keys(self, requested_max_keys: int | None) -> int:
        if requested_max_keys is None or requested_max_keys <= 0:
            return self._settings.max_list_keys

        return min(requested_max_keys, self._settings.max_list_keys)

    def _normalize_key(self, key: str) -> str:
        return unquote(key).lstrip("/")

    def _normalize_prefix(self, prefix: str) -> str:
        return unquote(prefix).lstrip("/")

    def _assert_prefix_allowed(self, path: str) -> None:
        if not self._settings.allowed_prefixes:
            return

        if any(self._prefix_matches(path, prefix) for prefix in self._settings.allowed_prefixes):
            return

        raise PermissionError(
            f"Access to '{path or '/'}' is restricted by S3_ALLOWED_PREFIXES"
        )

    def _prefix_matches(self, candidate: str, allowed_prefix: str) -> bool:
        if not candidate or not allowed_prefix:
            return False

        return candidate.startswith(allowed_prefix)

    def _looks_like_text(self, content_type: str, payload: bytes) -> bool:
        if any(content_type.startswith(prefix) for prefix in TEXT_CONTENT_TYPES):
            return True

        if b"\x00" in payload:
            return False

        try:
            text = payload.decode("utf-8")
        except UnicodeDecodeError:
            return False

        return not any(
            character not in {"\n", "\r", "\t"} and ord(character) < 32
            for character in text
        )

    def _to_iso_string(self, value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()

        return None


settings = load_settings()
service = S3BucketService(settings)
mcp = FastMCP("Biomed S3 Browser", json_response=True)


@mcp.resource("s3://bucket")
def bucket_root() -> dict[str, object]:
    return service.list_objects(prefix="")


@mcp.tool()
def list_bucket(
    prefix: str = "",
    delimiter: str = "/",
    max_keys: int | None = None,
) -> dict[str, object]:
    """List bucket contents by prefix."""
    return service.list_objects(prefix=prefix, delimiter=delimiter, max_keys=max_keys)


@mcp.tool()
def get_object_metadata(key: str) -> dict[str, object]:
    """Get metadata for a single object."""
    return service.get_object_metadata(key)


@mcp.tool(structured_output=False)
def read_object(key: str) -> str | bytes:
    """Read a single object from the configured bucket."""
    return service.read_object(key)


def run() -> None:
    transport = os.getenv("MCP_TRANSPORT", "stdio")
    mcp.run(transport=transport)
