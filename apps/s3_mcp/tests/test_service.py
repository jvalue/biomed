from __future__ import annotations

import io

from s3_mcp.server import S3BucketService, S3McpSettings


class FakeS3Client:
    def __init__(self) -> None:
        self.objects = {
            "documents/report.txt": {
                "Body": io.BytesIO(b"biomed report"),
                "ContentType": "text/plain; charset=utf-8",
                "ContentLength": 13,
                "ETag": '"abc123"',
                "LastModified": None,
                "Metadata": {"source": "test"},
            },
            "images/raw.bin": {
                "Body": io.BytesIO(b"\x00\x01\x02"),
                "ContentType": "application/octet-stream",
                "ContentLength": 3,
                "ETag": '"def456"',
                "LastModified": None,
                "Metadata": {},
            },
        }

    def list_objects_v2(self, **kwargs):
        prefix = kwargs.get("Prefix", "")
        contents = []
        common_prefixes = set()

        for key, value in self.objects.items():
            if prefix and not key.startswith(prefix):
                continue

            relative_key = key[len(prefix) :].lstrip("/") if prefix else key
            if "/" in relative_key:
                common_prefixes.add(
                    key[: len(key) - len(relative_key) + relative_key.index("/") + 1]
                )
                continue

            contents.append(
                {"Key": key, "Size": value["ContentLength"], "ETag": value["ETag"]}
            )

        return {
            "Contents": contents,
            "CommonPrefixes": [{"Prefix": item} for item in sorted(common_prefixes)],
            "IsTruncated": False,
        }

    def head_object(self, **kwargs):
        return self.objects[kwargs["Key"]]

    def get_object(self, **kwargs):
        return self.objects[kwargs["Key"]]


def make_service(allowed_prefixes: tuple[str, ...] = ()) -> S3BucketService:
    settings = S3McpSettings(
        endpoint_url="http://example.local:9000",
        bucket_name="biomed-data",
        timeout_seconds=5,
        max_list_keys=50,
        max_read_bytes=1024,
        allowed_prefixes=allowed_prefixes,
    )
    return S3BucketService(settings, client=FakeS3Client())


def test_list_objects_returns_keys_and_resource_uris() -> None:
    service = make_service()
    result = service.list_objects(prefix="documents")

    assert result["bucket"] == "biomed-data"
    assert result["prefix"] == "documents"
    assert result["count"] == 1
    assert result["objects"][0]["key"] == "documents/report.txt"
    assert result["objects"][0]["resource_uri"] == "s3://bucket/documents%2Freport.txt"


def test_prefix_allowlist_blocks_empty_listing_prefix() -> None:
    service = make_service(("documents/",))

    try:
        service.list_objects(prefix="")
    except PermissionError as exc:
        assert "S3_ALLOWED_PREFIXES" in str(exc)
    else:
        raise AssertionError("Expected PermissionError")


def test_prefix_allowlist_blocks_short_non_matching_prefix() -> None:
    service = make_service(("documents/",))

    try:
        service.list_objects(prefix="doc")
    except PermissionError as exc:
        assert "S3_ALLOWED_PREFIXES" in str(exc)
    else:
        raise AssertionError("Expected PermissionError")


def test_read_object_returns_text_or_binary() -> None:
    service = make_service()

    assert service.read_object("documents/report.txt") == "biomed report"
    assert service.read_object("images/raw.bin") == b"\x00\x01\x02"


def test_prefix_allowlist_blocks_unapproved_paths() -> None:
    service = make_service(("documents/",))

    assert service.read_object("documents/report.txt") == "biomed report"
    try:
        service.read_object("images/raw.bin")
    except PermissionError as exc:
        assert "S3_ALLOWED_PREFIXES" in str(exc)
    else:
        raise AssertionError("Expected PermissionError")
