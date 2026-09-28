"""Source adapter protocol for crawler-common.

Adapters translate source-specific listings (FTP, S3, REST API) into a
common node shape (`FTPNode`) and provide iteration and optional download
capabilities used by the runner.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Protocol

from crawler_common.ftp.ftp_node import SourceNode


class SourceAdapter(Protocol):
    """Protocol adapters should implement this interface.

    Implementations must be lightweight translators that yield nodes and
    optionally support downloading content for a node.
    """

    def list_roots(self) -> list[str]:
        """Return a list of available root identifiers (e.g. buckets, root folders)."""

    def iter_nodes(
        self, root: str | None = None, max_depth: int = 3
    ) -> Iterator[tuple[SourceNode, int]]:
        """Yield `(node, depth)` pairs for the given root.

        Depth is 0 for the root itself, 1 for immediate children, etc.
        """

    def download(self, node: SourceNode, dest: Path) -> bool:
        """Download node content to `dest` when applicable. Return True on success.

        May be a no-op for adapters that don't support downloads.
        """

    def download_to_uri(self, node: SourceNode, dest_uri: str) -> bool:
        """Download node content to a destination URI.

        `dest_uri` supports schemes such as `file://` for local paths and
        `s3://bucket/key` for remote S3 destinations. Return True on success.
        """

    def fetch_metadata(self, node: SourceNode) -> SourceNode:
        """Optionally refresh and return metadata for a node.

        Default implementation may simply return the passed node unchanged.
        """
