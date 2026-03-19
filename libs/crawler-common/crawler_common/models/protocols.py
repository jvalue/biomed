"""Protocol type definitions for crawler models."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol


class FTPNodeProtocol(Protocol):
    """Structural protocol for FTP tree nodes used across crawler packages."""

    name: str
    is_dir: bool
    path: str
    size: int | None
    modified: datetime | None
    children: list[FTPNodeProtocol]
