"""Protocol type definitions for crawler models.

The protocol was previously named `FTPNodeProtocol`. We now introduce a
source-agnostic `SourceNodeProtocol` while keeping `FTPNodeProtocol` as an
alias for backwards compatibility.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol


class SourceNodeProtocol(Protocol):
    """Structural protocol for discovered nodes used across crawler packages."""

    name: str
    is_dir: bool
    path: str
    size: int | None
    modified: datetime | None
    children: list["SourceNodeProtocol"]


# Backwards-compatibility alias
FTPNodeProtocol = SourceNodeProtocol
