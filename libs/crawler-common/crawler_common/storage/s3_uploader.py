"""S3 upload helpers supporting streaming uploads from iterators.

This module provides a small file-like wrapper around an iterator of bytes
so boto3's `upload_fileobj` can stream data without materializing it.
"""
from __future__ import annotations

import io
from typing import Iterator

from botocore.client import BaseClient


class IteratorStream(io.RawIOBase):
    """A read-only file-like object that consumes a bytes iterator."""

    def __init__(self, iterator: Iterator[bytes]):
        super().__init__()
        self._it = iterator
        self._buffer = bytearray()
        self._exhausted = False

    def readable(self) -> bool:  # pragma: no cover - simple wrapper
        return True

    def readinto(self, b):
        # Fill the provided writable buffer `b` and return number of bytes.
        if not self._buffer and not self._exhausted:
            try:
                chunk = next(self._it)
                if chunk:
                    self._buffer.extend(chunk)
            except StopIteration:
                self._exhausted = True

        if not self._buffer:
            return 0

        n = min(len(b), len(self._buffer))
        b[:n] = self._buffer[:n]
        del self._buffer[:n]
        return n


def upload_iterator_to_s3(client: BaseClient, bucket: str, key: str, iterator: Iterator[bytes]) -> None:
    """Upload bytes provided by `iterator` to S3 using streaming upload.

    This uses `upload_fileobj` and the `IteratorStream` wrapper to avoid
    buffering the entire content in memory.
    """
    stream = IteratorStream(iterator)
    # boto3 client used here (S3) provides upload_fileobj on the higher-level
    # S3 TransferManager via boto3.s3.transfer; but clients created via
    # `boto3.client('s3')` also have `upload_fileobj` convenience on their
    # `Bucket` resource. For widest compatibility we'll call the low-level
    # upload_fileobj exposed by the client's meta.s3_client when available.
    # Simpler approach: use client.upload_fileobj if present.

    # Many boto3 client objects expose `upload_fileobj` on the S3 resource, so
    # callers should pass a boto3 S3 Client supporting this method via
    # `client.upload_fileobj`. If not available, an alternative must be used.
    upload_fn = getattr(client, "upload_fileobj", None)
    if upload_fn is None:
        # Fallback: read fully into memory (last resort)
        data = b"".join(iterator)
        client.put_object(Bucket=bucket, Key=key, Body=data)
        return

    # The `upload_fileobj` expects a file-like object with read(). Use stream.
    upload_fn(stream, bucket, key)
