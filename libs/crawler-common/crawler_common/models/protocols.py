"""Protocol definitions for crawler models."""

from datetime import datetime
from typing import Protocol


class FTPNodeProtocol(Protocol):
    """Protocol defining the common interface for FTP node-like objects."""

    name: str
    is_dir: bool
    path: str
    size: int | None
    modified: datetime | None
