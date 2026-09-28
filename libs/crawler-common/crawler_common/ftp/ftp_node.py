"""Node data structure used across adapters and runners.

The library historically used `FTPNode` for FTP-specific crawlers. To make
the node type source-agnostic we introduce `SourceNode` and keep `FTPNode`
as a backward-compatible alias.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class SourceNode:
    """Represents a file-like or folder-like item discovered by a source.

    Fields are intentionally generic so adapters for FTP, S3 or other APIs
    can return this same type.
    """

    name: str
    is_dir: bool
    path: str
    size: int | None = None
    modified: datetime | None = None
    downloaded: bool = False
    children: list[SourceNode] = field(default_factory=list)

    def __repr__(self) -> str:  # pragma: no cover - for debugging only
        node_type = "folder" if self.is_dir else "file"
        return f"{node_type} {self.name}"


# Backwards-compatibility: keep the older FTPNode name as an alias.
FTPNode = SourceNode
