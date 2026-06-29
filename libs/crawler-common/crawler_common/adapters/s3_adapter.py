"""Example S3 adapter implementing the SourceAdapter protocol.

This is a small, example adapter that lists objects in a bucket (optionally
under a prefix) and yields `SourceNode` instances for each object.
"""
from __future__ import annotations

from pathlib import Path
from collections.abc import Iterator
from typing import Tuple

from crawler_common.ftp.ftp_node import SourceNode
from crawler_common.s3.client import create_s3_client


class S3Adapter:
    def __init__(self, endpoint_url: str, bucket: str, prefix: str | None = None, timeout_seconds: int = 10):
        self.endpoint_url = endpoint_url
        self.bucket = bucket
        self.prefix = prefix or ""
        self.timeout_seconds = timeout_seconds
        self.client = create_s3_client(endpoint_url=endpoint_url, timeout_seconds=timeout_seconds)

    def list_roots(self) -> list[str]:
        return [self.bucket]

    def iter_nodes(self, root: str | None = None, max_depth: int = 3) -> Iterator[Tuple[SourceNode, int]]:
        paginator = self.client.list_objects_v2(Bucket=self.bucket, Prefix=self.prefix)
        contents = paginator.get("Contents", [])
        for obj in contents:
            key = obj["Key"]
            # represent S3 key as a path
            path = f"/{key}"
            name = Path(key).name
            node = SourceNode(name=name, is_dir=False, path=path, size=int(obj.get("Size", 0)))
            depth = path.count("/")  # rough depth measure
            yield node, depth

    def download(self, node: SourceNode, dest: Path) -> bool:
        try:
            resp = self.client.get_object(Bucket=self.bucket, Key=node.path.lstrip("/"))
            data = resp["Body"].read()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            return True
        except Exception:
            return False

    def download_to_uri(self, node: SourceNode, dest_uri: str) -> bool:
        """Download the object to a destination URI (supports file:// and s3://).

        If the destination is another S3 URI, attempt an efficient server-side
        copy via `copy_object` when both source and destination are on S3.
        """
        try:
            if dest_uri.startswith("file://"):
                local_path = Path(dest_uri[len("file://"):])
                return self.download(node, local_path)

            if dest_uri.startswith("s3://"):
                # dest_uri: s3://bucket/key
                _, rest = dest_uri.split("s3://", 1)
                parts = rest.split("/", 1)
                dest_bucket = parts[0]
                dest_key = parts[1] if len(parts) > 1 else ""

                # If source and destination buckets are on the same endpoint,
                # do a server-side copy for efficiency.
                copy_source = {"Bucket": self.bucket, "Key": node.path.lstrip("/")}
                try:
                    self.client.copy_object(CopySource=copy_source, Bucket=dest_bucket, Key=dest_key)
                    return True
                except Exception:
                    # Fallback: download bytes and upload
                    resp = self.client.get_object(Bucket=self.bucket, Key=node.path.lstrip("/"))
                    body = resp["Body"].read()
                    self.client.put_object(Bucket=dest_bucket, Key=dest_key, Body=body)
                    return True

            # Unsupported scheme
            return False
        except Exception:
            return False

    def fetch_metadata(self, node: SourceNode) -> SourceNode:
        # No-op for example adapter
        return node
