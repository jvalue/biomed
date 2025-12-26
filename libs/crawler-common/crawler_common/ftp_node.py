"""FTP node data structure."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class FTPNode:
    """Represents a file or folder in the FTP structure."""

    name: str
    is_dir: bool
    path: str
    size: int | None = None
    modified: datetime | None = None
    children: list[FTPNode] = field(default_factory=list)

    def __repr__(self) -> str:  # pragma: no cover - for debugging only
        node_type = "folder" if self.is_dir else "file"
        return f"{node_type} {self.name}"
